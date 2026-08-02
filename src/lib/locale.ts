export type Locale = "en" | "ja";

export const DEFAULT_LOCALE: Locale = "en";

/** Maps our app-level locale to the locale/region CALL-E expects for a recipient. */
export const CALLE_RECIPIENT_LOCALE: Record<Locale, { locale: string; region: string }> = {
  en: { locale: "en-US", region: "US" },
  ja: { locale: "ja-JP", region: "JP" },
};

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "ja";
}

/**
 * CALL-E rejects call creation for Japan-recognized phone numbers unless the
 * locale is Japanese (confirmed via a real rejected call on 2026-08-02:
 * "The phone number is recognized as Japan, but English is not supported
 * for calls to Japan."). Validate this up front so a bad recipient/locale
 * combination is caught at registration time instead of wasting a CALL-E
 * request later.
 */
export function isLocaleSupportedForPhone(phone: string, locale: Locale): boolean {
  if (phone.startsWith("+81") && locale !== "ja") return false;
  return true;
}
