// Backend-only token counting utility for Vercel serverless functions.
// This file is used by API routes under `api/` (Node environment).

export function estimateTokenCountFromText(text: string): number {
  const chars = text.length;
  return Math.ceil(chars / 4);
}

export function estimateTokenCountFromJson(obj: unknown): number {
  try {
    const json = JSON.stringify(obj);
    return estimateTokenCountFromText(json);
  } catch {
    return 0;
  }
}
