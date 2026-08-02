import { Resend } from "resend";
import type { Call } from "@call-e/calle";
import { classifyWellnessResult, LEVEL_LABEL, type WellnessLevel } from "../calle/classify";
import type { Locale } from "../locale";

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

const LEVEL_EMOJI: Record<WellnessLevel, string> = {
  ok: "✅",
  mild_concern: "⚠️",
  escalate: "🔴",
};

const STRINGS: Record<
  Locale,
  {
    senderName: string;
    subjectPrefix: string;
    forWho: (name?: string) => string;
    heading: string;
    intro: (who: string) => string;
    verdictLabel: string;
    summaryLabel: string;
    noSummary: string;
    callIdLabel: string;
    completedAtLabel: string;
    unknown: string;
    disclaimer: string;
    fallbackWho: string;
  }
> = {
  en: {
    senderName: "Mimamori-Call",
    subjectPrefix: "Wellness call",
    forWho: (name) => (name ? `${name}'s` : ""),
    heading: "Wellness call result",
    intro: (who) => `The wellness check-in call to ${who} has finished.`,
    verdictLabel: "Result",
    summaryLabel: "Call summary",
    noSummary: "(no summary)",
    callIdLabel: "Call ID",
    completedAtLabel: "Completed at",
    unknown: "unknown",
    disclaimer:
      "This is an automated call and automated assessment, not a medical judgment. " +
      "If anything seems concerning, we recommend reaching out to them directly.",
    fallbackWho: "them",
  },
  ja: {
    senderName: "見守りコール",
    subjectPrefix: "見守りコール",
    forWho: (name) => (name ? `${name}さんの` : ""),
    heading: "見守りコール結果",
    intro: (who) => `${who}への安否確認のお電話が完了しました。`,
    verdictLabel: "判定",
    summaryLabel: "通話全体の要約",
    noSummary: "(要約なし)",
    callIdLabel: "通話ID",
    completedAtLabel: "完了日時",
    unknown: "不明",
    disclaimer:
      "※これは自動発信・自動判定によるお知らせです。医療的な判断ではありません。" +
      "気になる点があれば、ご本人へ直接連絡することをおすすめします。",
    fallbackWho: "ご本人",
  },
};

function buildSubject(level: WellnessLevel, locale: Locale, recipientName?: string): string {
  const t = STRINGS[locale];
  const who = t.forWho(recipientName);
  return locale === "ja"
    ? `${LEVEL_EMOJI[level]} [${t.subjectPrefix}] ${who}安否確認結果:${LEVEL_LABEL[locale][level]}`
    : `${LEVEL_EMOJI[level]} [${t.subjectPrefix}] ${who ? `${who} ` : ""}result: ${LEVEL_LABEL[locale][level]}`;
}

function buildHtmlBody(params: {
  level: WellnessLevel;
  reasons: string[];
  call: Call;
  locale: Locale;
  recipientName?: string;
}): string {
  const { level, reasons, call, locale, recipientName } = params;
  const t = STRINGS[locale];
  const who = recipientName ?? t.fallbackWho;
  const reasonsHtml = reasons.map((r) => `<li>${escapeHtml(r)}</li>`).join("");

  return `
    <div style="font-family: sans-serif; line-height: 1.6; color: #222;">
      <h2>${LEVEL_EMOJI[level]} ${t.heading}: ${LEVEL_LABEL[locale][level]}</h2>
      <p>${escapeHtml(t.intro(who))}</p>
      <p><strong>${t.verdictLabel}:</strong> ${LEVEL_LABEL[locale][level]}</p>
      <ul>${reasonsHtml}</ul>
      <hr />
      <p><strong>${t.summaryLabel}:</strong><br/>${escapeHtml(call.summary ?? t.noSummary)}</p>
      <p style="font-size: 0.85em; color: #666;">
        ${t.callIdLabel}: ${escapeHtml(call.id)}<br/>
        ${t.completedAtLabel}: ${escapeHtml(call.completedAt ?? t.unknown)}
      </p>
      <p style="font-size: 0.8em; color: #999;">
        ${escapeHtml(t.disclaimer)}
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
  locale: Locale;
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
  const { call, familyEmail, locale, recipientName, from = "onboarding@resend.dev" } = input;

  const { level, reasons } = classifyWellnessResult(call.structuredResult, locale);

  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: `${STRINGS[locale].senderName} <${from}>`,
    to: [familyEmail],
    subject: buildSubject(level, locale, recipientName),
    html: buildHtmlBody({ level, reasons, call, locale, recipientName }),
  });

  if (error) {
    throw new Error(`Failed to send notification email: ${JSON.stringify(error)}`);
  }

  return { level, reasons, emailId: data?.id ?? null };
}
