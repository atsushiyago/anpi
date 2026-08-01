import { NextRequest, NextResponse } from "next/server";
import { addRecipient, listRecipients } from "@/lib/store";

export async function GET() {
  const recipients = await listRecipients();
  return NextResponse.json({ recipients });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.phone !== "string" ||
    typeof body.familyEmail !== "string"
  ) {
    return NextResponse.json(
      { error: "name, phone, familyEmail は必須です。" },
      { status: 400 }
    );
  }

  if (!body.phone.startsWith("+")) {
    return NextResponse.json(
      { error: "phone は E.164 形式(例: +819012345678)で入力してください。" },
      { status: 400 }
    );
  }

  const recipient = await addRecipient({
    name: body.name,
    phone: body.phone,
    familyEmail: body.familyEmail,
  });

  return NextResponse.json({ recipient }, { status: 201 });
}
