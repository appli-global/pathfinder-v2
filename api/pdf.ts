import { MongoClient } from 'mongodb';
import { put } from '@vercel/blob';
import { Readable } from 'stream';
import { generateReportHtml } from './pdf-html-template';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

if (!uri) {
  console.warn('[pdf-api] MONGODB_URI is not set. PDF logging will be disabled.');
}

let cachedClient: MongoClient | null = null;

// WATI config (mirrors cron-generate-reports.ts)
const WATI_BASE_URL = process.env.WATI_BASE_URL;
const WATI_API_KEY = process.env.WATI_API_KEY;
const WATI_REPORT_TEMPLATE_NAME = 'career_pathfinder_report_ready_v2';
const WATI_CHANNEL_NUMBER = process.env.WATI_CHANNEL_NUMBER;

async function getClient() {
  if (!uri) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

/**
 * Generate a styled PDF from the analysis data using Puppeteer.
 * This renders the same HTML template used in the browser print flow.
 */
async function createStyledPdf(analysis: any): Promise<Buffer> {
  // Dynamic imports to avoid issues in environments where these aren't available
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

/**
 * Send a WATI template message with the report Blob URL.
 * Mirrors the helper in cron-generate-reports.ts.
 */
async function sendWatiTemplateMessage(args: {
  name: string;
  phone: string;
  url: string | null;
}) {
  try {
    if (!WATI_BASE_URL || !WATI_API_KEY) {
      console.warn('[pdf-api] WATI env vars missing, skipping WhatsApp notification');
      return;
    }

    const { name, phone, url } = args;
    const cleanedPhone = (phone || '').replace(/\D/g, '');
    if (!cleanedPhone) {
      console.warn('[pdf-api] No phone number for WATI send');
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

    console.log('[pdf-api] WATI request', {
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
    console.log('[pdf-api] WATI response', {
      status: resp.status,
      statusText: resp.statusText,
      body: responseText,
    });

    if (!resp.ok) {
      console.warn('[pdf-api] WATI send failed', resp.status, responseText);
      return;
    }

    console.log('[pdf-api] WATI notification sent', { phone: cleanedPhone });
  } catch (err) {
    console.warn('[pdf-api] Error while sending WATI notification', err);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getClient();
    if (!client) {
      console.warn('[pdf-api] No Mongo client, skipping PDF generation');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { sessionId, level, analysis } = req.body || {};

    if (!sessionId || !level || !analysis) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, level, analysis' });
    }

    const db = client.db(dbName);
    const collection = db.collection('pathfinder_analysis_result');

    const pdfBuffer = await createStyledPdf(analysis);
    const now = new Date();

    // Store the generated PDF as base64 in MongoDB
    const pdfBase64 = pdfBuffer.toString('base64');

    // Upload PDF to Vercel Blob storage
    let reportBlobUrl: string | null = null;
    try {
      const fileName = `reports/${sessionId}.pdf`;
      const stream = Readable.from(pdfBuffer);
      const blob = await put(fileName, stream, {
        access: 'public',
        contentType: 'application/pdf',
      });
      reportBlobUrl = blob.url;
      console.log('[pdf-api] Uploaded PDF to Blob', { sessionId, url: reportBlobUrl });
    } catch (blobErr) {
      console.warn('[pdf-api] Failed to upload PDF to Blob', blobErr);
    }

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          pdfBase64,
          pdfGeneratedAt: now,
          ...(reportBlobUrl ? { reportBlobUrl } : {}),
        },
      },
      { upsert: false },
    );

    // Send WATI notification if not already sent and we have a Blob URL.
    // IMPORTANT: Must await — Vercel kills serverless functions after res is sent.
    if (reportBlobUrl) {
      try {
        // Fetch the document to get billing info and check if already notified
        const doc = await collection.findOne({ sessionId });
        const billing = (doc as any)?.billing;
        const alreadyNotified = !!(doc as any)?.watiReportNotifiedAt;

        if (!alreadyNotified && billing && billing.phone) {
          await sendWatiTemplateMessage({
            name: billing.name,
            phone: billing.phone,
            url: reportBlobUrl,
          });

          await collection.updateOne(
            { sessionId },
            { $set: { watiReportNotifiedAt: new Date() } },
          ).catch((err) => {
            console.warn('[pdf-api] Failed to mark watiReportNotifiedAt', sessionId, err);
          });
        } else {
          console.log('[pdf-api] Skipping WATI', {
            sessionId,
            alreadyNotified,
            hasBilling: !!billing,
            hasPhone: !!billing?.phone,
          });
        }
      } catch (watiErr) {
        console.warn('[pdf-api] Error during WATI check/send', watiErr);
      }
    }

    return res.status(200).json({ ok: true, reportBlobUrl });
  } catch (err) {
    console.error('[pdf-api] Error generating PDF', err);
    return res.status(200).json({ ok: false, error: 'pdf_generation_failed' });
  }
}
