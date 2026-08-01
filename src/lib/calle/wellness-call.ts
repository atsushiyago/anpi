import type { Call, JsonObject } from '@call-e/calle';
import { getCalleClient } from './client';

export interface PlaceWellnessCallInput {
  /** E.164 phone number, e.g. "+819012345678" */
  phone: string;
  name?: string;
  /** Natural-language description of what the call should accomplish. */
  task: string;
  /** JSON Schema describing the structured data CALL-E should return. */
  resultSchema: JsonObject;
  metadata?: JsonObject;
  /** Durable key so retries of the same logical call don't dial twice. */
  idempotencyKey?: string;
}

/** Adds a polite name reference for the bot's tone. The phone number itself
 *  goes through `recipient`, not the task text, so it's never duplicated. */
function buildTask(input: PlaceWellnessCallInput): string {
  if (!input.name) return input.task;
  return `相手は${input.name}さんです。${input.task}`;
}

export async function placeCall(input: PlaceWellnessCallInput): Promise<Call> {
  const client = getCalleClient();
  return client.calls.create(
    {
      task: buildTask(input),
      recipient: { phone: input.phone },
      resultSchema: input.resultSchema,
      metadata: input.metadata,
    },
    { idempotencyKey: input.idempotencyKey },
  );
}

export async function placeCallAndWait(
  input: PlaceWellnessCallInput,
  waitOptions?: { intervalMs?: number; timeoutMs?: number },
): Promise<Call> {
  const client = getCalleClient();
  return client.calls.createAndWait(
    {
      task: buildTask(input),
      recipient: { phone: input.phone },
      resultSchema: input.resultSchema,
      metadata: input.metadata,
    },
    { idempotencyKey: input.idempotencyKey, ...waitOptions },
  );
}

export async function getCallResult(callId: string): Promise<Call> {
  const client = getCalleClient();
  return client.calls.get(callId);
}

export type { Call } from '@call-e/calle';
