import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'appli';

if (!uri) {
  console.warn('[session-api] MONGODB_URI is not set. Session logging will be disabled.');
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
      console.warn('[session-api] No Mongo client, skipping write');
      return res.status(200).json({ ok: true, skipped: true });
    }

    const { sessionId, level, answers, stage, resultSummary } = req.body || {};

    if (!sessionId || !level || !stage) {
      return res.status(400).json({ error: 'Missing required fields: sessionId, level, stage' });
    }

    const db = client.db(dbName);
    const collection = db.collection('pathfinder_sessions');

    const now = new Date();

    const update: any = {
      $setOnInsert: {
        sessionId,
        level,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
        stage,
      },
    };

    if (answers && stage === 'completed') {
      update.$set.answers = answers;
    }

    if (resultSummary && stage === 'analyzed') {
      update.$set.resultSummary = resultSummary;
    }

    await collection.updateOne({ sessionId }, update, { upsert: true });

    console.log('[session-api] Upserted session', {
      sessionId,
      level,
      stage,
      hasAnswers: !!answers,
      hasResultSummary: !!resultSummary,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[session-api] Error logging session', err);
    // Do not fail the client flow because of logging issues
    return res.status(200).json({ ok: false, error: 'logging_failed' });
  }
}
