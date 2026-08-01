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

async function main() {
  const phone = process.env.CALLE_TEST_PHONE;
  if (!phone) {
    throw new Error(
      'Set CALLE_TEST_PHONE in .env.local before running this script.',
    );
  }

  console.log(`Placing test call to ${phone} ...`);

  const call = await placeCallAndWait(
    {
      phone,
      task:
        '見守りの安否確認のお電話です。' +
        '以下の3つを、この順番で、ゆっくり分かりやすい口調で尋ねてください。' +
        '1. 「今日の体調はいかがですか?」' +
        '2. 「お食事はちゃんと摂れていますか?」' +
        '3. 「何か困っていることや、必要なものはありますか?」' +
        '各質問は、ゆっくりと、一語ずつはっきり発音してください。' +
        '各質問について、回答が得られたら(内容が良くても悪くても)次の質問に進んでください。' +
        '同じ質問を繰り返したり、長く沈黙したりしないでください。' +
        '3つ目の質問の回答が得られたら、一言ねぎらいの言葉をかけて丁寧に会話を締めくくり、電話を切ってください。' +
        '相手が答えにくそうにしていたら、質問を言い換えて構いません。' +
        '医療的な助言や診断は絶対に行わないでください。',
      resultSchema: {
        type: 'object',
        required: [
          'answered',
          'condition_summary',
          'meal_status',
          'concerns_reported',
        ],
        properties: {
          answered: {
            type: 'boolean',
            description: '本人が電話に応答したかどうか',
          },
          condition_summary: {
            type: 'string',
            description:
              "体調についての回答を一言で要約(例:'良い','少しだるい')",
          },
          meal_status: {
            type: 'string',
            enum: ['good', 'somewhat_concerning', 'unknown'],
            description: '食事が摂れているかの大まかな判定',
          },
          concerns_reported: {
            type: 'boolean',
            description: '困りごとや必要なものが報告されたか',
          },
          concerns_detail: {
            type: 'string',
            description: '困りごとの内容(あれば)',
          },
        },
      },
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
