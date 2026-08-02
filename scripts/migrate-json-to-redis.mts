/**
 * One-time migration: loads data/wellness-data.json (the old file-based
 * store) into Upstash Redis under the same key store.ts now reads/writes.
 * Safe to re-run — it just overwrites the Redis key with the file's content.
 *
 *   npm run migrate:to-redis
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { promises as fs } from "fs";
import path from "path";
import { Redis } from "@upstash/redis";

const DATA_FILE = path.join(process.cwd(), "data", "wellness-data.json");
const STORE_KEY = "wellness:data";

async function main() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Set UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in .env.local first.");
  }

  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const data = JSON.parse(raw);

  console.log(
    `Migrating ${data.recipients?.length ?? 0} recipient(s) and ${data.calls?.length ?? 0} call record(s) to Redis...`
  );

  const redis = new Redis({ url, token });
  await redis.set(STORE_KEY, data);

  console.log("Done. Verify with the dashboard, then consider deleting data/wellness-data.json.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
