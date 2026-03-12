import { MongoClient } from 'mongodb';
import { put } from '@vercel/blob';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

let cachedClient: MongoClient | null = null;

async function getClient() {
  if (!uri) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

// Minimal WATI config and helper for cron-triggered notifications.
const WATI_BASE_URL = process.env.WATI_BASE_URL;
const WATI_API_KEY = process.env.WATI_API_KEY;
// Use the report-ready template for cron (not the invoice template)
const WATI_REPORT_TEMPLATE_NAME = 'career_pathfinder_report_ready_v2';
const WATI_CHANNEL_NUMBER = process.env.WATI_CHANNEL_NUMBER;

async function sendWatiTemplateMessage(args: {
  name: string;
  phone: string;
  url: string | null;
}) {
  try {
    if (!WATI_BASE_URL || !WATI_API_KEY) {
      console.warn('[cron-generate-reports] WATI env vars missing, skipping WhatsApp notification');
      return;
    }

    const { name, phone, url } = args;
    const cleanedPhone = (phone || '').replace(/\D/g, '');
    if (!cleanedPhone) {
      console.warn('[cron-generate-reports] No phone number for WATI send');
      return;
    }

    const baseUrl = WATI_BASE_URL.replace(/\/$/, '');
    const endpoint = `${baseUrl}/api/v2/sendTemplateMessages`;

    const payload: any = {
      template_name: WATI_REPORT_TEMPLATE_NAME,
      broadcast_name: 'Pathfinder Report',
      receivers: [
        {
          whatsappNumber: cleanedPhone,
          customParams: [
            { name: '1', value: name || 'there' },
            { name: '2', value: url || '-' },
          ],
        },
      ],
      ...(WATI_CHANNEL_NUMBER ? { channel_number: WATI_CHANNEL_NUMBER } : {}),
    };

    console.log('[cron-generate-reports] WATI request', {
      endpoint,
      phone: cleanedPhone,
      template: WATI_REPORT_TEMPLATE_NAME,
      payload,
    });

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${WATI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await resp.text();
    console.log('[cron-generate-reports] WATI response', {
      status: resp.status,
      statusText: resp.statusText,
      body: responseText,
    });

    if (!resp.ok) {
      console.warn('[cron-generate-reports] WATI send failed', resp.status, responseText);
      return;
    }

    console.log('[cron-generate-reports] WATI notification sent', { phone: cleanedPhone });
  } catch (err) {
    console.warn('[cron-generate-reports] Error while sending WATI notification', err);
  }
}

function createAnalysisPdf(analysis: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(analysis?.data?.archetype?.title || 'Pathfinder Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(analysis?.data?.archetype?.description || '', { align: 'left' });

    doc.moveDown();
    doc.fontSize(14).text('Top Recommendations:', { underline: true });
    const recs = analysis?.data?.recommendations || [];
    recs.slice(0, 3).forEach((rec: any, idx: number) => {
      doc.moveDown(0.5);
      doc.fontSize(12).text(`${idx + 1}. ${rec.courseName} (${rec.degree})`);
      if (rec.matchReason) {
        doc.fontSize(10).text(`Why: ${rec.matchReason}`);
      }
    });

    doc.end();
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getClient();
    if (!client) {
      console.warn('[cron-generate-reports] No Mongo client, skipping');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const db = client.db(dbName);
    const collection = db.collection('pathfinder_analysis_result');

    const pending = await collection
      .find({ analysis: { $exists: true }, pdfBase64: { $in: [null, ''] } })
      .limit(10)
      .toArray();

    if (!pending.length) {
      console.log('[cron-generate-reports] No pending sessions');
      return res.status(200).json({ ok: true, processed: 0 });
    }

    let processed = 0;

    for (const doc of pending) {
      const { sessionId, analysis, billing, watiReportNotifiedAt } = doc as any;
      if (!sessionId || !analysis) continue;

      const pdfBuffer = await createAnalysisPdf(analysis);
      const pdfBase64 = pdfBuffer.toString('base64');

      // optional: also upload PDF to Blob
      const fileName = `reports/${sessionId}.pdf`;
      const stream = Readable.from(pdfBuffer);
      const blob = await put(fileName, stream, {
        access: 'public',
        contentType: 'application/pdf',
      });

      await collection.updateOne(
        { sessionId },
        {
          $set: {
            pdfBase64,
            pdfGeneratedAt: new Date(),
            reportBlobUrl: blob.url,
          },
        },
      );

      // Send a dedicated "Pathfinder report ready" WATI message using the
      // report Blob URL, once per session. This uses a minimal helper
      // defined in this file to avoid cross-import issues.
      if (!watiReportNotifiedAt && billing && blob.url) {
        try {
          // Fire-and-forget: don't block the cron run on external WATI latency.
          sendWatiTemplateMessage({
            name: billing.name,
            phone: billing.phone,
            url: blob.url,
          })
            .then(() =>
              collection
                .updateOne(
                  { sessionId },
                  { $set: { watiReportNotifiedAt: new Date() } },
                )
                .catch((err) => {
                  console.warn(
                    '[cron-generate-reports] Failed to mark watiReportNotifiedAt',
                    sessionId,
                    err,
                  );
                }),
            )
            .catch((err) => {
              console.warn('[cron-generate-reports] WATI report send failed for session', sessionId, err);
            });
        } catch (err) {
          console.warn('[cron-generate-reports] WATI report send failed for session', sessionId, err);
        }
      }

      processed += 1;
    }

    return res.status(200).json({ ok: true, processed });
  } catch (err) {
    console.error('[cron-generate-reports] Error', err);
    return res.status(500).json({ ok: false, error: 'cron_failed' });
  }
}
