import { BlobClient } from '@vercel/blob';

// Minimal helper around Vercel Blob so we don't sprinkle client setup everywhere.
// This expects BLOB_READ_WRITE_TOKEN to be configured in the environment.

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
  console.warn('[vercel-blob] BLOB_READ_WRITE_TOKEN is not set. Blob uploads will be disabled.');
}

let cachedClient: BlobClient | null = null;

export function getBlobClient() {
  if (!BLOB_TOKEN) return null;
  if (cachedClient) return cachedClient;
  cachedClient = new BlobClient({ token: BLOB_TOKEN });
  return cachedClient;
}
