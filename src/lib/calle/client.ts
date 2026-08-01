import { CalleClient } from "@call-e/calle";

let cachedClient: CalleClient | null = null;

/**
 * Lazily-constructed singleton so importing this module doesn't throw when
 * CALLE_API_KEY isn't set yet (e.g. during `next build` on a machine without secrets).
 */
export function getCalleClient(): CalleClient {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.CALLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "CALLE_API_KEY is not set. Copy .env.local.example to .env.local and fill it in."
    );
  }

  cachedClient = new CalleClient({
    apiKey,
    baseUrl: process.env.CALLE_BASE_URL,
  });

  return cachedClient;
}
