import { intlLocale, type Locale } from "@/lib/i18n/config";

export type Formatters = ReturnType<typeof createFormatters>;

export function createFormatters(locale: Locale) {
  const l = intlLocale(locale);

  const money = new Intl.NumberFormat(l, {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  });
  const moneyExact = new Intl.NumberFormat(l, {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const moneyCompact = new Intl.NumberFormat(l, {
    style: "currency",
    currency: "RUB",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const integer = new Intl.NumberFormat(l, { maximumFractionDigits: 0 });
  const compact = new Intl.NumberFormat(l, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const decimal = new Intl.NumberFormat(l, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
  const dayMonth = new Intl.DateTimeFormat(l, {
    day: "numeric",
    month: "short",
  });
  const dayMonthYear = new Intl.DateTimeFormat(l, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const monthYear = new Intl.DateTimeFormat(l, {
    month: "short",
    year: "2-digit",
  });
  const dateTime = new Intl.DateTimeFormat(l, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    money: (value: number) => money.format(value),
    moneyExact: (value: number) => moneyExact.format(value),
    moneyCompact: (value: number) => moneyCompact.format(value),
    integer: (value: number) => integer.format(value),
    compact: (value: number) => compact.format(value),
    decimal: (value: number) => decimal.format(value),
    /** Werte kommen als Prozentpunkte (1.42), nicht als Anteil. */
    percent: (points: number) => `${decimal.format(points)} %`,
    ratio: (value: number) => decimal.format(value),
    /** Vorzeichen gehört zur Zahl, damit es nicht am Umbruch hängen bleibt. */
    delta: (points: number) =>
      `${points > 0 ? "+" : points < 0 ? "−" : ""}${decimal.format(Math.abs(points))} %`,
    dayMonth: (value: Date | string) => dayMonth.format(new Date(value)),
    dayMonthYear: (value: Date | string) => dayMonthYear.format(new Date(value)),
    monthYear: (value: Date | string) => monthYear.format(new Date(value)),
    dateTime: (value: Date | string) => dateTime.format(new Date(value)),
    /** Ein Zeitraum in einem Zug. Die Jahreszahl steht nur hinten, wenn beide
     *  Enden im selben Jahr liegen — zweimal „2026" sagt nichts dazu. */
    dateSpan: (from: string, to: string) =>
      `${(from.slice(0, 4) === to.slice(0, 4) ? dayMonth : dayMonthYear).format(new Date(from))} — ${dayMonthYear.format(new Date(to))}`,
  };
}
