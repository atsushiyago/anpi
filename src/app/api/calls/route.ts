import { NextRequest, NextResponse } from "next/server";
import { getRecipient, listCalls } from "@/lib/store";
import { runWellnessCheck } from "@/lib/wellness-service";

export async function GET(request: NextRequest) {
  const recipientId = request.nextUrl.searchParams.get("recipientId") ?? undefined;
  const calls = await listCalls(recipientId);
  return NextResponse.json({ calls });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body || typeof body.recipientId !== "string") {
    return NextResponse.json({ error: "recipientId is required." }, { status: 400 });
  }

  const recipient = await getRecipient(body.recipientId);
  if (!recipient) {
    return NextResponse.json({ error: "recipientId not found." }, { status: 404 });
  }

  const result = await runWellnessCheck(recipient);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(
    {
      level: result.level,
      reasons: result.reasons,
      callId: result.callId,
      notified: result.notified,
      notifyError: result.notifyError,
    },
    { status: 201 }
  );
}
