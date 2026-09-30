export const LOCALES = ["ru", "de", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ru";

export const LOCALE_COOKIE = "ecobrush_locale";

/** Kurzschild im Umschalter. */
export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "RU",
  de: "DE",
  en: "EN",
};

/** Zahlen und Daten folgen der Sprache, die Währung bleibt immer der Rubel. */
const INTL_LOCALES: Record<Locale, string> = {
  ru: "ru-RU",
  de: "de-DE",
  en: "en-GB",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function intlLocale(locale: Locale): string {
  return INTL_LOCALES[locale];
}
