import { MongoClient } from 'mongodb';
import { put } from '@vercel/blob';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { sendInvoiceViaWati } from './invoice';

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

function createAnalysisPdf(analysis: any): Buffer {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

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
  return Buffer.concat(chunks);
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

    let processed = 0;

    for (const doc of pending) {
      const {
        sessionId,
        analysis,
        billing,
        invoiceNumber,
        invoiceBlobUrl,
        watiInvoiceNotifiedAt,
        watiReportNotifiedAt,
        paymentSummary,
      } = doc as any;
      if (!sessionId || !analysis) continue;

      const pdfBuffer = createAnalysisPdf(analysis);
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

      // Option A: also send the invoice WATI message from cron for sessions
      // that have invoice metadata but haven't been notified yet.
      if (!watiInvoiceNotifiedAt && billing && invoiceNumber) {
        try {
          const amountPaise: number | undefined = paymentSummary?.amount;
          const grossAmount = typeof amountPaise === 'number' ? amountPaise / 100 : 0;

          await sendInvoiceViaWati({
            billing,
            invoiceNumber,
            invoiceUrl: invoiceBlobUrl || null,
            grossAmount,
          });

          await collection.updateOne(
            { sessionId },
            { $set: { watiInvoiceNotifiedAt: new Date() } },
          );
        } catch (err) {
          console.warn('[cron-generate-reports] WATI send failed for session', sessionId, err);
        }
      }

      // Additionally, send a dedicated "Pathfinder report ready" WATI message
      // using the report Blob URL, once per session. This uses the same
      // sendInvoiceViaWati helper but passes the report URL instead of the
      // invoice URL so the WhatsApp template can include the analytics PDF link.
      if (!watiReportNotifiedAt && billing && blob.url) {
        try {
          await sendInvoiceViaWati({
            billing,
            invoiceNumber: invoiceNumber || sessionId,
            invoiceUrl: blob.url,
            grossAmount: 0,
          });

          await collection.updateOne(
            { sessionId },
            { $set: { watiReportNotifiedAt: new Date() } },
          );
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
