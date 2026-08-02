import { NextRequest, NextResponse } from "next/server";
import { deleteRecipient, getRecipient, updateRecipient } from "@/lib/store";
import { isLocale, isLocaleSupportedForPhone, type Locale } from "@/lib/locale";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Partial<{ name: string; phone: string; familyEmail: string; locale: Locale }> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.phone === "string") {
    if (!body.phone.startsWith("+")) {
      return NextResponse.json(
        { error: "phone must be in E.164 format (e.g. +819012345678)." },
        { status: 400 }
      );
    }
    updates.phone = body.phone;
  }
  if (typeof body.familyEmail === "string") updates.familyEmail = body.familyEmail;
  if (body.locale !== undefined) {
    if (!isLocale(body.locale)) {
      return NextResponse.json({ error: "locale must be 'en' or 'ja'." }, { status: 400 });
    }
    updates.locale = body.locale;
  }

  const existing = await getRecipient(id);
  if (!existing) {
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }

  const effectivePhone = updates.phone ?? existing.phone;
  const effectiveLocale = updates.locale ?? existing.locale;
  if (!isLocaleSupportedForPhone(effectivePhone, effectiveLocale)) {
    return NextResponse.json(
      { error: "CALL-E does not support English calls to Japanese phone numbers. Please select Japanese." },
      { status: 400 }
    );
  }

  const recipient = await updateRecipient(id, updates);
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }

  return NextResponse.json({ recipient });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteRecipient(id);
  if (!deleted) {
    return NextResponse.json({ error: "Recipient not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
