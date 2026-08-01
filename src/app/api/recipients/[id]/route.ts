import { NextRequest, NextResponse } from "next/server";
import { updateRecipient } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "リクエスト内容が不正です。" }, { status: 400 });
  }

  const updates: Record<string, string> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.phone === "string") {
    if (!body.phone.startsWith("+")) {
      return NextResponse.json(
        { error: "phone は E.164 形式(例: +819012345678)で入力してください。" },
        { status: 400 }
      );
    }
    updates.phone = body.phone;
  }
  if (typeof body.familyEmail === "string") updates.familyEmail = body.familyEmail;

  const recipient = await updateRecipient(id, updates);
  if (!recipient) {
    return NextResponse.json({ error: "指定された recipient が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json({ recipient });
}
