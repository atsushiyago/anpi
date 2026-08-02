import { NextRequest, NextResponse } from "next/server";
import { listRecipients } from "@/lib/store";
import { runWellnessCheck } from "@/lib/wellness-service";

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
  const results = [];
  for (const recipient of recipients) {
    const result = await runWellnessCheck(recipient);
    results.push(result);
  }

  return NextResponse.json({ results });
}
