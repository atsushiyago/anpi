import { NextRequest, NextResponse } from "next/server";
import { placeCallAndWait } from "@/lib/calle/wellness-call";
import { classifyWellnessResult } from "@/lib/calle/classify";
import { WELLNESS_TASK, WELLNESS_RESULT_SCHEMA } from "@/lib/calle/wellness-script";
import { notifyFamilyOfCallResult } from "@/lib/notify/email";
import { addCallRecord, listRecipients } from "@/lib/store";

// Wellness calls can take anywhere from ~30s to several minutes to complete
// (see 2026-08-01/02 testing notes). Extend the function's execution budget
// accordingly. Verify this value against your current Vercel plan's actual
// limits — see https://vercel.com/docs/functions/runtimes#max-duration.
export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed if not configured
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = await listRecipients();
  const results: Array<{ recipientId: string; ok: boolean; level?: string; error?: string }> = [];

  // Sequential on purpose: keeps concurrent CALL-E usage/cost predictable and
  // avoids racing against the function's time budget with parallel calls.
  for (const recipient of recipients) {
    try {
      const call = await placeCallAndWait(
        {
          phone: recipient.phone,
          task: WELLNESS_TASK,
          resultSchema: WELLNESS_RESULT_SCHEMA,
          idempotencyKey: `wellness-cron:${recipient.id}:${new Date().toISOString().slice(0, 10)}`,
        },
        { timeoutMs: 8 * 60 * 1000 }
      );

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

      await notifyFamilyOfCallResult({
        call,
        familyEmail: recipient.familyEmail,
        recipientName: recipient.name,
      });

      results.push({ recipientId: recipient.id, ok: true, level });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ recipientId: recipient.id, ok: false, error: message });
    }
  }

  return NextResponse.json({ results });
}
