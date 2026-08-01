import { Resend } from "resend";
import type { Call } from "@call-e/calle";
import { classifyWellnessResult, type WellnessLevel } from "../calle/classify";

let cachedResend: Resend | null = null;

function getResendClient(): Resend {
  if (cachedResend) return cachedResend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to .env.local (see Resend dashboard → API Keys)."
    );
  }
  cachedResend = new Resend(apiKey);
  return cachedResend;
}

const LEVEL_LABEL: Record<WellnessLevel, string> = {
  ok: "問題なし",
  mild_concern: "軽度の懸念あり",
  escalate: "要確認",
};

const LEVEL_EMOJI: Record<WellnessLevel, string> = {
  ok: "✅",
  mild_concern: "⚠️",
  escalate: "🔴",
};

function buildSubject(level: WellnessLevel, recipientName?: string): string {
  const who = recipientName ? `${recipientName}さんの` : "";
  return `${LEVEL_EMOJI[level]} [見守りコール] ${who}安否確認結果:${LEVEL_LABEL[level]}`;
}

function buildHtmlBody(params: {
  level: WellnessLevel;
  reasons: string[];
  call: Call;
  recipientName?: string;
}): string {
  const { level, reasons, call, recipientName } = params;
  const who = recipientName ? `${recipientName}さん` : "ご本人";
  const reasonsHtml = reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #222;">
      <h2>${LEVEL_EMOJI[level]} 見守りコール結果:${LEVEL_LABEL[level]}</h2>
      <p>${escapeHtml(who)}への安否確認のお電話が完了しました。</p>
      <p><strong>判定:</strong> ${LEVEL_LABEL[level]}</p>
      <ul>${reasonsHtml}</ul>
      <hr />
      <p><strong>通話全体の要約:</strong><br/>${escapeHtml(call.summary ?? "(要約なし)")}</p>
      <p style="font-size: 0.85em; color: #666;">
        通話ID: ${escapeHtml(call.id)}<br/>
        完了日時: ${escapeHtml(call.completedAt ?? "不明")}
      </p>
      <p style="font-size: 0.8em; color: #999;">
        ※これは自動発信・自動判定によるお知らせです。医療的な判断ではありません。
        気になる点があれば、ご本人へ直接連絡することをおすすめします。
      </p>
    </div>
  `;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export interface NotifyFamilyInput {
  call: Call;
  familyEmail: string;
  recipientName?: string;
  /** Verified sender address. Use "onboarding@resend.dev" for quick testing. */
  from?: string;
}

export interface NotifyFamilyResult {
  level: WellnessLevel;
  reasons: string[];
  emailId: string | null;
}

/**
 * Classifies a completed wellness call and emails a summary to the family
 * contact. Always sends — the family should be informed of "ok" results too,
 * not just problems, so they know the check actually happened.
 */
export async function notifyFamilyOfCallResult(
  input: NotifyFamilyInput
): Promise<NotifyFamilyResult> {
  const { call, familyEmail, recipientName, from = "onboarding@resend.dev" } = input;

  const { level, reasons } = classifyWellnessResult(call.structuredResult);

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: `見守りコール <${from}>`,
    to: [familyEmail],
    subject: buildSubject(level, recipientName),
    html: buildHtmlBody({ level, reasons, call, recipientName }),
  });

  if (error) {
    throw new Error(`Failed to send notification email: ${JSON.stringify(error)}`);
  }

  return { level, reasons, emailId: data?.id ?? null };
}
