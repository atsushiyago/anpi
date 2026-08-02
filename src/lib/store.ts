import { Redis } from "@upstash/redis";
import type { WellnessLevel } from "./calle/classify";
import type { Locale } from "./locale";

/** Recipients created before locale support shipped don't have this field in
 *  Redis yet. They're real Japanese users already receiving Japanese calls,
 *  so default missing locale to "ja" rather than the app-wide "en" default
 *  (which only applies to newly-created recipients). */
const LEGACY_RECIPIENT_LOCALE: Locale = "ja";

const STORE_KEY = "wellness:data";

let cachedRedis: Redis | null = null;

function getRedis(): Redis {
  if (cachedRedis) return cachedRedis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN is not set. See .env.local.example."
    );
  }

  cachedRedis = new Redis({ url, token });
  return cachedRedis;
}

export interface Recipient {
  id: string;
  name: string;
  phone: string; // E.164 format, e.g. "+819012345678"
  familyEmail: string;
  /** Language the wellness call and notification email should use for this person. */
  locale: Locale;
  createdAt: string;
}

export interface CallRecord {
  id: string; // CALL-E's call.id
  recipientId: string;
  status: string;
  level: WellnessLevel;
  reasons: string[];
  conditionSummary: string | null;
  summary: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface StoreShape {
  recipients: Recipient[];
  calls: CallRecord[];
}

async function readStore(): Promise<StoreShape> {
  const stored = await getRedis().get<StoreShape>(STORE_KEY);
  if (!stored) return { recipients: [], calls: [] };

  stored.recipients = stored.recipients.map((r) => ({
    ...r,
    locale: r.locale ?? LEGACY_RECIPIENT_LOCALE,
  }));
  return stored;
}

async function writeStore(store: StoreShape): Promise<void> {
  await getRedis().set(STORE_KEY, store);
}

export async function listRecipients(): Promise<Recipient[]> {
  const store = await readStore();
  return store.recipients;
}

export async function addRecipient(
  input: Omit<Recipient, "id" | "createdAt">
): Promise<Recipient> {
  const store = await readStore();
  const recipient: Recipient = {
    ...input,
    id: `rec_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  store.recipients.push(recipient);
  await writeStore(store);
  return recipient;
}

export async function getRecipient(id: string): Promise<Recipient | null> {
  const store = await readStore();
  return store.recipients.find((r) => r.id === id) ?? null;
}

export async function updateRecipient(
  id: string,
  updates: Partial<Omit<Recipient, "id" | "createdAt">>
): Promise<Recipient | null> {
  const store = await readStore();
  const recipient = store.recipients.find((r) => r.id === id);
  if (!recipient) return null;

  Object.assign(recipient, updates);
  await writeStore(store);
  return recipient;
}

export async function deleteRecipient(id: string): Promise<boolean> {
  const store = await readStore();
  const index = store.recipients.findIndex((r) => r.id === id);
  if (index === -1) return false;

  store.recipients.splice(index, 1);
  // Also scrub this recipient's call history (contains health-related summaries).
  store.calls = store.calls.filter((c) => c.recipientId !== id);
  await writeStore(store);
  return true;
}

export async function listCalls(recipientId?: string): Promise<CallRecord[]> {
  const store = await readStore();
  const calls = recipientId
    ? store.calls.filter((c) => c.recipientId === recipientId)
    : store.calls;
  // Newest first.
  return [...calls].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addCallRecord(record: CallRecord): Promise<void> {
  const store = await readStore();
  store.calls.push(record);
  await writeStore(store);
}
