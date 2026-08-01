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
import { notifyFamilyOfCallResult } from "../src/lib/notify/email";

async function main() {
  const phone = process.env.CALLE_TEST_PHONE;
  const familyEmail = process.env.FAMILY_TEST_EMAIL;

  if (!phone) {
    throw new Error("Set CALLE_TEST_PHONE in .env.local before running this script.");
  }
  if (!familyEmail) {
    throw new Error("Set FAMILY_TEST_EMAIL in .env.local before running this script.");
  }

  console.log(`Placing wellness call to ${phone} ...`);

  const call = await placeCallAndWait(
    {
      phone,
      task:
        "見守りの安否確認のお電話です。" +
        "以下の3つを、この順番で、ゆっくり分かりやすい口調で尋ねてください。" +
        "1. 「今日の体調はいかがですか?」" +
        "2. 「お食事はちゃんと摂れていますか?」" +
        "3. 「何か困っていることや、必要なものはありますか?」" +
        "各質問は、ゆっくりと、一語ずつはっきり発音してください。" +
        "各質問について、回答が得られたら(内容が良くても悪くても)次の質問に進んでください。" +
        "同じ質問を繰り返したり、長く沈黙したりしないでください。" +
        "3つ目の質問の回答が得られたら、一言ねぎらいの言葉をかけて丁寧に会話を締めくくり、電話を切ってください。" +
        "相手が答えにくそうにしていたら、質問を言い換えて構いません。" +
        "医療的な助言や診断は絶対に行わないでください。",
      resultSchema: {
        type: "object",
        required: ["answered", "condition_summary", "meal_status", "concerns_reported"],
        properties: {
          answered: { type: "boolean", description: "本人が電話に応答したかどうか" },
          condition_summary: { type: "string", description: "体調についての回答を一言で要約" },
          meal_status: {
            type: "string",
            enum: ["good", "somewhat_concerning", "unknown"],
            description: "食事が摂れているかの大まかな判定",
          },
          concerns_reported: { type: "boolean", description: "困りごとや必要なものが報告されたか" },
          concerns_detail: { type: "string", description: "困りごとの内容(あれば)" },
        },
      },
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
