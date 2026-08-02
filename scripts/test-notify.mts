/**
 * End-to-end check: places ONE real wellness call, then emails the family
 * contact with the classified result. Run against a test/dummy number and
 * a test/dummy family email you're authorized to use.
 *
 *   npm run test:notify
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { placeCallAndWait } from "../src/lib/calle/wellness-call";
import { getWellnessTask, WELLNESS_RESULT_SCHEMA } from "../src/lib/calle/wellness-script";
import { notifyFamilyOfCallResult } from "../src/lib/notify/email";
import { isLocale, type Locale } from "../src/lib/locale";

async function main() {
  const phone = process.env.CALLE_TEST_PHONE;
  const familyEmail = process.env.FAMILY_TEST_EMAIL;

  if (!phone) {
    throw new Error("Set CALLE_TEST_PHONE in .env.local before running this script.");
  }
  if (!familyEmail) {
    throw new Error("Set FAMILY_TEST_EMAIL in .env.local before running this script.");
  }

  const rawLocale = process.env.CALLE_TEST_LOCALE;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";

  console.log(`Placing wellness call to ${phone} (locale: ${locale}) ...`);

  const call = await placeCallAndWait(
    {
      phone,
      locale,
      task: getWellnessTask(locale),
      resultSchema: WELLNESS_RESULT_SCHEMA,
      idempotencyKey: `test-notify:${phone}:${Date.now()}`,
    },
    { timeoutMs: 10 * 60 * 1000 }
  );

  console.log("\n=== Call result ===");
  console.log("status:          ", call.status);
  console.log("structuredResult:", call.structuredResult);

  console.log("\nSending notification email...");
  const notifyResult = await notifyFamilyOfCallResult({
    call,
    familyEmail,
    locale,
    recipientName: process.env.CALLE_TEST_RECIPIENT_NAME,
  });

  console.log("\n=== Notification result ===");
  console.log("level:  ", notifyResult.level);
  console.log("reasons:", notifyResult.reasons);
  console.log("emailId:", notifyResult.emailId);
}

main().catch((err) => {
  console.error("Test notify failed:", err.message ?? err);
  process.exit(1);
});
