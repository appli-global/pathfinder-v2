import { MongoClient } from 'mongodb';
import { Readable } from 'stream';
import { put } from '@vercel/blob';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

let cachedClient: MongoClient | null = null;

async function getClient() {
  if (!uri) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new MongoClient(uri!);
  await cachedClient.connect();
  return cachedClient;
}

/**
 * POST /api/upload-invoice
 * Body: { sessionId: string }
 *
 * Looks up the invoice PDF (if stored as base64 or buffer) for the given session
 * and uploads it to Vercel Blob as `invoices/<invoiceNumber>.pdf`, then stores
 * the resulting public URL back into Mongo as `invoiceBlobUrl`.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getClient();
    if (!client) {
      console.warn('[upload-invoice-api] No Mongo client');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' });
    }

    const db = client.db(dbName);
    const collection = db.collection('pathfinder_analysis_result');

    const doc = await collection.findOne({ sessionId });
    if (!doc) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const invoiceNumber: string | undefined = (doc as any).invoiceNumber;
    const invoiceBase64: string | undefined = (doc as any).invoiceBase64;

    if (!invoiceNumber || !invoiceBase64) {
      return res.status(400).json({ error: 'No invoice PDF stored for this session' });
    }

    const pdfBuffer = Buffer.from(invoiceBase64, 'base64');

    let invoiceBlobUrl: string | null = null;
    try {
      const blobName = `invoices/${invoiceNumber}.pdf`;
      const stream = Readable.from(pdfBuffer);
      const result = await put(blobName, stream as any, {
        access: 'public',
        contentType: 'application/pdf',
      } as any);
      invoiceBlobUrl = result.url;
      console.log('[upload-invoice-api] Uploaded invoice PDF to Blob', { sessionId, invoiceNumber, url: invoiceBlobUrl });
    } catch (err) {
      console.warn('[upload-invoice-api] Failed to upload invoice PDF to Blob', err);
      return res.status(200).json({ ok: false, error: 'blob_upload_failed' });
    }

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          invoiceBlobUrl,
          invoiceBlobUploadedAt: new Date(),
        },
      },
    );

    return res.status(200).json({ ok: true, invoiceBlobUrl });
  } catch (err) {
    console.error('[upload-invoice-api] Error uploading invoice PDF', err);
    return res.status(200).json({ ok: false, error: 'upload_invoice_failed' });
  }
}
