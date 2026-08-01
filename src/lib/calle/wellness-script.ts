import type { JsonObject } from "@call-e/calle";

/**
 * The standard 3-question wellness check script, refined through manual
 * testing on 2026-08-01/02: explicit turn-taking and termination instructions
 * were necessary to prevent the agent from looping on ambiguous or negative
 * responses instead of moving on.
 */
export const WELLNESS_TASK =
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
  "医療的な助言や診断は絶対に行わないでください。";

export const WELLNESS_RESULT_SCHEMA: JsonObject = {
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
};
