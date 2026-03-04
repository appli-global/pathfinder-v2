import { MongoClient } from 'mongodb';
import PDFDocument from 'pdfkit';
import { put } from '@vercel/blob';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

if (!uri) {
  console.warn('[pdf-api] MONGODB_URI is not set. PDF logging will be disabled.');
}

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

  // Basic content based on analysis structure
  doc.fontSize(18).text(analysis?.data?.archetype?.title || 'Pathfinder Report', {
    underline: true,
  });

  doc.moveDown();
  doc.fontSize(12).text(analysis?.data?.archetype?.description || '', {
    align: 'left',
  });

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

  doc.moveDown();
  doc.fontSize(14).text('Parent Letter (Summary):', { underline: true });
  const pl = analysis?.data?.parentLetterData;
  if (pl) {
    doc.moveDown(0.5);
    doc.fontSize(10).text(pl.paragraph3 || '');
    doc.moveDown(0.5);
    doc.fontSize(10).text(pl.paragraph6 || '');
  }

  doc.end();

  // Combine chunks into a single Buffer
  return Buffer.concat(chunks);
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

  const pdfBuffer = createAnalysisPdf(analysis);

  const now = new Date();
  // Store PDFs under the pf-reports/reports/ prefix in Blob storage
  const blobKey = `pf-reports/reports/${sessionId}-${now.toISOString()}.pdf`;

    let pdfBlobUrl: string | null = null;
    try {
      const { url } = await put(blobKey, pdfBuffer, {
        access: 'private',
      });
      pdfBlobUrl = url;
      console.log('[pdf-api] Stored PDF blob', { sessionId, blobKey, url });
    } catch (blobErr) {
      console.warn('[pdf-api] Failed to store PDF blob', blobErr);
    }

    if (pdfBlobUrl) {
      await collection.updateOne(
        { sessionId },
        {
          $set: {
            pdfBlobUrl,
            pdfGeneratedAt: now,
          },
        },
        { upsert: false },
      );
    }

    return res.status(200).json({ ok: true, pdfBlobUrl });
  } catch (err) {
    console.error('[pdf-api] Error generating PDF', err);
    return res.status(200).json({ ok: false, error: 'pdf_generation_failed' });
  }
}
