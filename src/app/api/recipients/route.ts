import { NextRequest, NextResponse } from "next/server";
import { addRecipient, listRecipients } from "@/lib/store";
import { DEFAULT_LOCALE, isLocale, isLocaleSupportedForPhone } from "@/lib/locale";

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
      { error: "name, phone, familyEmail are required." },
      { status: 400 }
    );
  }

  if (!body.phone.startsWith("+")) {
    return NextResponse.json(
      { error: "phone must be in E.164 format (e.g. +819012345678)." },
      { status: 400 }
    );
  }

  if (body.locale !== undefined && !isLocale(body.locale)) {
    return NextResponse.json({ error: "locale must be 'en' or 'ja'." }, { status: 400 });
  }

  const locale = isLocale(body.locale) ? body.locale : DEFAULT_LOCALE;
  if (!isLocaleSupportedForPhone(body.phone, locale)) {
    return NextResponse.json(
      { error: "CALL-E does not support English calls to Japanese phone numbers. Please select Japanese." },
      { status: 400 }
    );
  }

  const recipient = await addRecipient({
    name: body.name,
    phone: body.phone,
    familyEmail: body.familyEmail,
    locale,
  });

  return NextResponse.json({ recipient }, { status: 201 });
}
