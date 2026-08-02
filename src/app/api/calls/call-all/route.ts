import { NextResponse } from "next/server";
import { listRecipients } from "@/lib/store";
import { runWellnessCheck } from "@/lib/wellness-service";

// Calling several people back-to-back can take a while (each call can run
// from ~30s up to several minutes — see 2026-08-01/02 testing notes).
export const maxDuration = 300;

export async function POST() {
  const recipients = await listRecipients();

  // Sequential on purpose — same reasoning as the Cron job: predictable
  // CALL-E usage/cost, and avoids racing multiple long calls in parallel.
  const results = [];
  for (const recipient of recipients) {
    const result = await runWellnessCheck(recipient);
    results.push({ name: recipient.name, ...result });
  }

  return NextResponse.json({ results });
}
