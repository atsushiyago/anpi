import { promises as fs } from "fs";
import path from "path";
import type { WellnessLevel } from "./calle/classify";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "wellness-data.json");

export interface Recipient {
  id: string;
  name: string;
  phone: string; // E.164 format, e.g. "+819012345678"
  familyEmail: string;
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

async function ensureDataFile(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    const empty: StoreShape = { recipients: [], calls: [] };
    await fs.writeFile(DATA_FILE, JSON.stringify(empty, null, 2), "utf-8");
  }
}

async function readStore(): Promise<StoreShape> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  return JSON.parse(raw) as StoreShape;
}

async function writeStore(store: StoreShape): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
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
