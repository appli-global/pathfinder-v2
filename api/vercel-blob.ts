import { put, del, list } from "@vercel/blob";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!BLOB_TOKEN) {
  console.warn(
    "[vercel-blob] BLOB_READ_WRITE_TOKEN is not set. Blob uploads will be disabled."
  );
}

// Upload file
export async function uploadBlob(filename: string, file: Buffer | Blob) {
  if (!BLOB_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing");
  }

  const blob = await put(filename, file, {
    access: "public",
    token: BLOB_TOKEN,
  });

  return blob;
}

// Delete file
export async function deleteBlob(url: string) {
  if (!BLOB_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing");
  }

  await del(url, { token: BLOB_TOKEN });
}

// List files
export async function listBlobs() {
  if (!BLOB_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing");
  }

  return await list({ token: BLOB_TOKEN });
}