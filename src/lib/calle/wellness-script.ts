import type { JsonObject } from "@call-e/calle";
import type { Locale } from "../locale";

/**
 * The standard 3-question wellness check script, refined through manual
 * testing on 2026-08-01/02: explicit turn-taking and termination instructions
 * were necessary to prevent the agent from looping on ambiguous or negative
 * responses instead of moving on.
 */
const WELLNESS_TASK_JA =
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

const WELLNESS_TASK_EN =
  "This is a wellness check-in call. " +
  "Ask the following 3 questions, in this order, slowly and in a clear, friendly tone. " +
  '1. "How are you feeling today?" ' +
  '2. "Have you been eating properly?" ' +
  '3. "Is there anything you\'re worried about, or anything you need?" ' +
  "Speak each question slowly and pronounce it clearly. " +
  "For each question, once you get an answer (whether it's good or bad), move on to the next question. " +
  "Do not repeat the same question or leave long silences. " +
  "Once the third question is answered, say a brief kind word, wrap up the conversation politely, and end the call. " +
  "If the person seems to have trouble answering, feel free to rephrase the question. " +
  "Never give medical advice or a diagnosis, under any circumstances.";

export function getWellnessTask(locale: Locale): string {
  return locale === "ja" ? WELLNESS_TASK_JA : WELLNESS_TASK_EN;
}

export const WELLNESS_RESULT_SCHEMA: JsonObject = {
  type: "object",
  required: ["answered", "condition_summary", "meal_status", "concerns_reported"],
  properties: {
    answered: { type: "boolean", description: "Whether the person answered the call." },
    condition_summary: {
      type: "string",
      description: "One-line summary of their answer about how they're feeling.",
    },
    meal_status: {
      type: "string",
      enum: ["good", "somewhat_concerning", "unknown"],
      description: "Rough assessment of whether they're eating properly.",
    },
    concerns_reported: {
      type: "boolean",
      description: "Whether they reported any concern or thing they need.",
    },
    concerns_detail: {
      type: "string",
      description: "Details of the reported concern, if any.",
    },
  },
};
