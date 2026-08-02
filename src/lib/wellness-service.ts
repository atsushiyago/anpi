import { placeCallAndWait } from "./calle/wellness-call";
import { classifyWellnessResult } from "./calle/classify";
import { WELLNESS_TASK, WELLNESS_RESULT_SCHEMA } from "./calle/wellness-script";
import { notifyFamilyOfCallResult } from "./notify/email";
import { addCallRecord, type Recipient } from "./store";

export interface WellnessCheckResult {
  recipientId: string;
  ok: boolean;
  level?: "ok" | "mild_concern" | "escalate";
  reasons?: string[];
  callId?: string;
  notified?: boolean;
  notifyError?: string | null;
  error?: string;
}

/**
 * Runs one full wellness check for a recipient: places the call, waits for
 * completion, classifies the result, persists it, then attempts to notify
 * the family contact by email. A notification failure (e.g. Resend
 * test-mode restrictions on the recipient address) is reported but does
 * NOT count as an overall failure — the call itself already succeeded and
 * is already saved by that point.
 *
 * Used by: the manual "call now" button, the "call everyone now" button,
 * and the daily Cron job — keeping the logic in one place so those three
 * entry points can't drift out of sync.
 */
export async function runWellnessCheck(recipient: Recipient): Promise<WellnessCheckResult> {
  let call;
  try {
    call = await placeCallAndWait(
      {
        phone: recipient.phone,
        task: WELLNESS_TASK,
        resultSchema: WELLNESS_RESULT_SCHEMA,
        idempotencyKey: `wellness:${recipient.id}:${Date.now()}`,
      },
      { timeoutMs: 10 * 60 * 1000 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { recipientId: recipient.id, ok: false, error: `通話に失敗しました: ${message}` };
  }

  const { level, reasons } = classifyWellnessResult(call.structuredResult);

  await addCallRecord({
    id: call.id,
    recipientId: recipient.id,
    status: call.status,
    level,
    reasons,
    conditionSummary:
      (call.structuredResult?.condition_summary as string | undefined) ?? null,
    summary: call.summary,
    createdAt: call.createdAt,
    completedAt: call.completedAt,
  });

  let notified = true;
  let notifyError: string | null = null;
  try {
    await notifyFamilyOfCallResult({
      call,
      familyEmail: recipient.familyEmail,
      recipientName: recipient.name,
    });
  } catch (err) {
    notified = false;
    notifyError = err instanceof Error ? err.message : String(err);
  }

  return {
    recipientId: recipient.id,
    ok: true,
    level,
    reasons,
    callId: call.id,
    notified,
    notifyError,
  };
}
