import type { JsonObject } from "@call-e/calle";

export type WellnessLevel = "ok" | "mild_concern" | "escalate";

export interface WellnessStructuredResult {
  answered: boolean;
  condition_summary?: string;
  meal_status?: "good" | "somewhat_concerning" | "unknown";
  concerns_reported?: boolean;
  concerns_detail?: string;
}

export interface ClassificationResult {
  level: WellnessLevel;
  reasons: string[];
}

/**
 * Keywords in `condition_summary` that suggest the person's condition is
 * concerning enough to combine with a reported "concern" and trigger
 * escalation. This is a coarse heuristic, not a medical judgment — it only
 * decides whether to notify family sooner, never what's wrong.
 */
const CONCERNING_CONDITION_KEYWORDS = [
  "痛い",
  "痛み",
  "動けない",
  "苦しい",
  "しんどい",
  "調子が悪い",
  "具合が悪い",
  "気持ち悪い",
  "めまい",
  "発熱",
  "熱がある",
  "倒れ",
];

function conditionSoundsConcerning(summary?: string): boolean {
  if (!summary) return false;
  return CONCERNING_CONDITION_KEYWORDS.some((kw) => summary.includes(kw));
}

/**
 * Classifies a completed wellness call's structuredResult into one of three
 * levels: "ok", "mild_concern", or "escalate".
 *
 * Rule (as decided): "standard" strictness — escalate when there's a
 * reported concern *combined with* a concerning condition, or when the
 * person didn't answer at all. A concern or a condition issue alone is
 * treated as a mild concern, not an escalation.
 */
export function classifyWellnessResult(
  result: JsonObject | WellnessStructuredResult | null
): ClassificationResult {
  const reasons: string[] = [];

  if (!result) {
    return { level: "escalate", reasons: ["構造化結果が取得できませんでした(通話失敗の可能性)"] };
  }

  const r = result as WellnessStructuredResult;

  // No answer at all -> can't confirm safety, escalate immediately.
  if (r.answered === false) {
    return { level: "escalate", reasons: ["電話に応答がありませんでした"] };
  }

  const hasConcern = r.concerns_reported === true;
  const mealConcerning = r.meal_status === "somewhat_concerning";
  const conditionConcerning = conditionSoundsConcerning(r.condition_summary);

  if (hasConcern) reasons.push(`困りごとの申告あり: ${r.concerns_detail ?? "(詳細不明)"}`);
  if (mealConcerning) reasons.push("食事の摂取に懸念あり");
  if (conditionConcerning) reasons.push(`体調に懸念を示す発言: 「${r.condition_summary}」`);

  const conditionOrMealConcerning = mealConcerning || conditionConcerning;

  // Standard rule: concern + condition/meal issue together -> escalate.
  if (hasConcern && conditionOrMealConcerning) {
    return { level: "escalate", reasons };
  }

  // Either factor alone -> mild concern.
  if (hasConcern || conditionOrMealConcerning) {
    return { level: "mild_concern", reasons };
  }

  return { level: "ok", reasons: ["体調・食事・困りごとすべて良好との回答でした"] };
}
