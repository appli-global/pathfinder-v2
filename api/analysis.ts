import { MongoClient } from 'mongodb';
import { put } from '@vercel/blob';
import { estimateTokenCountFromJson } from '../utils/tokenCount';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

if (!uri) {
  console.warn('[analysis-api] MONGODB_URI is not set. Analysis logging will be disabled.');
}

let cachedClient: MongoClient | null = null;

async function getClient() {
  if (!uri) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await getClient();
    if (!client) {
      console.warn('[analysis-api] No Mongo client, skipping write');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { sessionId, level, analysis } = req.body || {};

    if (!sessionId || !level || !analysis) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, level, analysis' });
    }

    const db = client.db(dbName);
    const collection = db.collection('pathfinder_analysis_result');

    const now = new Date();

    const tokenCount = estimateTokenCountFromJson(analysis);

    // Store full analysis JSON as a blob in Vercel Blob storage
    let blobUrl: string | null = null;
    try {
      const blobKey = `analysis/${sessionId}-${now.toISOString()}.json`;
      const { url } = await put(blobKey, JSON.stringify(analysis, null, 2), {
        access: 'private',
      });
      blobUrl = url;
      console.log('[analysis-api] Stored analysis blob', { sessionId, blobKey, url });
    } catch (blobErr) {
      console.warn('[analysis-api] Failed to store analysis blob', blobErr);
    }

    await collection.updateOne(
      { sessionId },
      {
        $set: {
          sessionId,
          level,
          analysis,
          tokenCount,
          blobUrl,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    console.log('[analysis-api] Upserted analysis result', {
      sessionId,
      level,
      blobUrl,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[analysis-api] Error logging analysis', err);
    return res.status(200).json({ ok: false, error: 'logging_failed' });
  }
}
