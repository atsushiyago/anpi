import { NextRequest, NextResponse } from "next/server";
import { placeCallAndWait } from "@/lib/calle/wellness-call";
import { classifyWellnessResult } from "@/lib/calle/classify";
import { WELLNESS_TASK, WELLNESS_RESULT_SCHEMA } from "@/lib/calle/wellness-script";
import { notifyFamilyOfCallResult } from "@/lib/notify/email";
import { addCallRecord, getRecipient, listCalls } from "@/lib/store";

export async function GET(request: NextRequest) {
  const recipientId = request.nextUrl.searchParams.get("recipientId") ?? undefined;
  const calls = await listCalls(recipientId);
  return NextResponse.json({ calls });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.recipientId !== "string") {
    return NextResponse.json({ error: "recipientId は必須です。" }, { status: 400 });
  }

  const recipient = await getRecipient(body.recipientId);
  if (!recipient) {
    return NextResponse.json({ error: "指定された recipientId が見つかりません。" }, { status: 404 });
  }

  try {
    const call = await placeCallAndWait(
      {
        phone: recipient.phone,
        task: WELLNESS_TASK,
        resultSchema: WELLNESS_RESULT_SCHEMA,
        idempotencyKey: `wellness:${recipient.id}:${Date.now()}`,
      },
      { timeoutMs: 10 * 60 * 1000 }
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

    return NextResponse.json({ level, reasons, callId: call.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `通話に失敗しました: ${message}` }, { status: 502 });
  }
}
