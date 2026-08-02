/**
 * Minimal connectivity check: places ONE real call through CALL-E and prints
 * the structured result. Run this against a test/dummy number you're
 * authorized to call — see README.md for setup.
 *
 *   npm run test:call
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { placeCallAndWait } from '../src/lib/calle/wellness-call';
import { getWellnessTask, WELLNESS_RESULT_SCHEMA } from '../src/lib/calle/wellness-script';
import { isLocale, type Locale } from '../src/lib/locale';

async function main() {
  const phone = process.env.CALLE_TEST_PHONE;
  if (!phone) {
    throw new Error(
      'Set CALLE_TEST_PHONE in .env.local before running this script.',
    );
  }

  const rawLocale = process.env.CALLE_TEST_LOCALE;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : 'en';

  console.log(`Placing test call to ${phone} (locale: ${locale}) ...`);

  const call = await placeCallAndWait(
    {
      phone,
      locale,
      task: getWellnessTask(locale),
      resultSchema: WELLNESS_RESULT_SCHEMA,
      idempotencyKey: `test-call:${phone}:${Date.now()}`,
    },
    { timeoutMs: 10 * 60 * 1000 },
  );

  console.log('call.id:', call.id);
  console.log(JSON.stringify(call, null, 2));
  console.log('\n=== Call result ===');
  console.log('status:          ', call.status);
  console.log('structuredResult:', call.structuredResult);
  console.log('summary:         ', call.summary);
  console.log('failureCode:     ', call.failureCode);
  console.log('failureMessage:  ', call.failureMessage);
}

main().catch((err) => {
  console.error('Test call failed:', err.message ?? err);
  if (err?.details) {
    console.error('details:', JSON.stringify(err.details, null, 2));
  }
  process.exit(1);
});
