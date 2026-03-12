import { MongoClient } from 'mongodb';
import { put } from '@vercel/blob';
import { Readable } from 'stream';
import { generateReportHtml } from './pdf-html-template';

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

/**
 * Generate a styled PDF from the analysis data using Puppeteer.
 * Uses the same HTML template as the browser print flow.
 */
async function createStyledPdf(analysis: any): Promise<Buffer> {
  const chromium = (await import('@sparticuz/chromium')).default;
  const puppeteer = (await import('puppeteer-core')).default;

  const html = generateReportHtml(analysis);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: { width: 794, height: 1123 },
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfUint8 = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdfUint8);
  } finally {
    await browser.close();
  }
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

      const pdfBuffer = await createStyledPdf(analysis);
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
