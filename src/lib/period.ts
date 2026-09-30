import type { DailyMetrics, DailySpend } from "@/lib/ozon/types";

/** Rollende Fenster zählen vom letzten Tag mit Zahlen zurück, die übrigen
 *  richten sich nach dem Kalender. Die Reihenfolge ist die der Schaltflächen. */
export const PRESET_KEYS = [
  "7d",
  "30d",
  "90d",
  "mtd",
  "lastMonth",
  "ytd",
  "lastYear",
  "all",
] as const;

export type Preset = (typeof PRESET_KEYS)[number];
export const DEFAULT_PRESET: Preset = "30d";

export type Selection =
  | { kind: "preset"; preset: Preset }
  | { kind: "custom"; from: string; to: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function asDate(value: string | string[] | undefined): string | null {
  return typeof value === "string" && ISO_DATE.test(value) ? value : null;
}

/** Ein gültiges Datumspaar schlägt die Voreinstellung; sonst zählt `r`. */
export function parseSelection(params: {
  r?: string | string[];
  from?: string | string[];
  to?: string | string[];
}): Selection {
  const from = asDate(params.from);
  const to = asDate(params.to);
  if (from && to) {
    return from <= to
      ? { kind: "custom", from, to }
      : { kind: "custom", from: to, to: from };
  }

  const preset = PRESET_KEYS.find((key) => key === params.r);
  return { kind: "preset", preset: preset ?? DEFAULT_PRESET };
}

/** Die Query-Parameter zur aktuellen Auswahl — damit andere Filter den
 *  Zeitraum beim Umschalten nicht verlieren. */
export function selectionParams(
  selection: Selection,
): Record<string, string | undefined> {
  if (selection.kind === "custom") {
    return { from: selection.from, to: selection.to, r: undefined };
  }
  return {
    r: selection.preset === DEFAULT_PRESET ? undefined : selection.preset,
    from: undefined,
    to: undefined,
  };
}

/** Ein aufgelöster Zeitraum: beide Grenzen einschließlich. */
export type Range = { from: string; to: string; days: number };

export function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayCount(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.floor(ms / 86_400_000) + 1;
}

/** Vom Monatsersten aus gerechnet, damit kein 31. in einen kurzen Monat
 *  überläuft. */
function shiftMonths(date: string, months: number): string {
  const d = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function monthEnd(date: string): string {
  return shiftDays(shiftMonths(date, 1), -1);
}

function presetRange(
  preset: Preset,
  anchor: string,
  start: string,
): { from: string; to: string } {
  switch (preset) {
    case "mtd":
      return { from: shiftMonths(anchor, 0), to: anchor };
    case "lastMonth": {
      const from = shiftMonths(anchor, -1);
      return { from, to: monthEnd(from) };
    }
    case "ytd":
      return { from: `${anchor.slice(0, 4)}-01-01`, to: anchor };
    case "lastYear": {
      const year = Number(anchor.slice(0, 4)) - 1;
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    case "all":
      return { from: start, to: anchor };
    default: {
      const length = Number.parseInt(preset, 10);
      return { from: shiftDays(anchor, -(length - 1)), to: anchor };
    }
  }
}

/** Voreinstellungen enden am letzten Tag, für den Ozon Zahlen hat — nicht
 *  heute, denn der laufende Tag wird erst nachts abgeschlossen. */
export function resolveRange(
  selection: Selection,
  series: { date: string }[],
): Range {
  if (selection.kind === "custom") {
    return {
      from: selection.from,
      to: selection.to,
      days: dayCount(selection.from, selection.to),
    };
  }

  const anchor = series.at(-1)?.date ?? new Date().toISOString().slice(0, 10);
  const { from, to } = presetRange(
    selection.preset,
    anchor,
    series[0]?.date ?? anchor,
  );

  return { from, to, days: dayCount(from, to) };
}

export const GRANULARITIES = ["day", "week", "month"] as const;
export type Granularity = (typeof GRANULARITIES)[number];

/** Ohne ausdrückliche Wahl entscheidet die Länge des Zeitraums. */
export function parseGranularity(
  value: string | string[] | undefined,
  fallback: Granularity,
): Granularity {
  return GRANULARITIES.find((candidate) => candidate === value) ?? fallback;
}

/** Über lange Zeiträume ist eine Tageslinie nur noch Rauschen. */
export function defaultGranularity(days: number): Granularity {
  if (days > 180) return "month";
  if (days > 62) return "week";
  return "day";
}

/** Leere Werte fallen raus, damit die Standardansicht auf der nackten URL
 *  landet und nicht auf `?r=30d&g=day`. */
export function withParams(
  path: string,
  params: Record<string, string | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Der Werbereport und die Analytik decken nicht exakt dieselben Tage ab —
 *  summiert wird deshalb nur über die Tage, die in der Metrikreihe stehen. */
export function spendFor(byDay: DailySpend[], rows: DailyMetrics[]): number {
  const dates = new Set(rows.map((row) => row.date));
  return byDay
    .filter((entry) => dates.has(entry.date))
    .reduce((acc, entry) => acc + entry.spend, 0);
}

/** Werbeausgaben auf dieselben Bündel wie die Metrikreihe verteilt: jeder Tag
 *  fällt in das letzte Bündel, das nicht nach ihm beginnt. Beide Reihen sind
 *  nach Datum sortiert, deshalb genügt ein Durchlauf. */
export function spendPerBucket(
  buckets: { date: string }[],
  byDay: DailySpend[],
  to: string,
): number[] {
  const values = buckets.map(() => 0);
  if (buckets.length === 0) return values;

  let i = 0;
  for (const entry of byDay) {
    if (entry.date < buckets[0].date || entry.date > to) continue;
    while (i + 1 < buckets.length && buckets[i + 1].date <= entry.date) i++;
    values[i] += entry.spend;
  }

  return values;
}
