import { cacheLife, cacheTag } from "next/cache";
import { shiftDays, type Granularity, type Range } from "@/lib/period";
import { OZON_LIVE, sellerPost } from "./client";
import { loadFixture } from "./fixtures";
import {
  METRIC_KEYS,
  type DailyMetrics,
  type Metrics,
  type SkuMetrics,
} from "./types";

/** Ozon lehnt Zeiträume über einem Jahr ab, deshalb wird die Historie in
 *  Jahresscheiben geholt. Mehr als fünf Scheiben fragt niemand nach. */
const CHUNK_DAYS = 364;
const MAX_CHUNKS = 5;

type AnalyticsResponse = {
  result: {
    data: { dimensions: { id: string; name: string }[]; metrics: number[] }[];
    totals: number[];
  };
};

function toMetrics(values: number[]): Metrics {
  const at = (key: (typeof METRIC_KEYS)[number]) =>
    values[METRIC_KEYS.indexOf(key)] ?? 0;

  return {
    revenue: at("revenue"),
    orderedUnits: at("ordered_units"),
    views: at("hits_view"),
    searchViews: at("hits_view_search"),
    toCart: at("hits_tocart"),
    convToCart: at("conv_tocart"),
    returns: at("returns"),
    cancellations: at("cancellations"),
  };
}

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

function hasActivity(rows: DailyMetrics[]): boolean {
  return rows.some((row) => row.revenue > 0 || row.views > 0);
}

/** Die vollständige Tagesreihe seit Kontostart. Sie wird einmal geholt und im
 *  Speicher zerschnitten — jeder frei gewählte Zeitraum wäre sonst ein
 *  weiterer Treffer in das Limit von einer Anfrage pro Minute. */
export async function getDailySeries(): Promise<DailyMetrics[]> {
  "use cache";
  cacheLife("ozon");
  cacheTag("ozon-analytics");

  if (!OZON_LIVE) {
    const raw = await loadFixture<AnalyticsResponse>("analytics-daily.json");
    return raw.result.data.map((row) => ({
      date: row.dimensions[0].id,
      ...toMetrics(row.metrics),
    }));
  }

  const series: DailyMetrics[] = [];
  // Ozon schließt den laufenden Tag erst nachts ab, deshalb endet die Reihe
  // gestern. Rückwärts, bis eine Jahresscheibe leer bleibt — so braucht es
  // keinen fest verdrahteten Kontostart.
  let to = isoDay(1);

  for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
    const from = shiftDays(to, -CHUNK_DAYS);
    const raw = await sellerPost<AnalyticsResponse>("/v1/analytics/data", {
      date_from: from,
      date_to: to,
      metrics: [...METRIC_KEYS],
      dimension: ["day"],
      filters: [],
      sort: [{ key: "day", order: "ASC" }],
      limit: 1000,
      offset: 0,
    });

    const rows = raw.result.data.map((row) => ({
      date: row.dimensions[0].id,
      ...toMetrics(row.metrics),
    }));

    series.unshift(...rows);
    if (!hasActivity(rows)) break;
    to = shiftDays(from, -1);
  }

  // Tage vor dem ersten Umsatz sind reine Nullen und würden jede „alle Zeit“-
  // Ansicht mit leerem Vorlauf strecken.
  const start = series.findIndex((row) => row.revenue > 0 || row.views > 0);
  return start > 0 ? series.slice(start) : series;
}

/** Zerlegt einen Zeitraum in Scheiben, die Ozons Jahresgrenze einhalten. */
function chunkRange(from: string, to: string): { from: string; to: string }[] {
  const chunks: { from: string; to: string }[] = [];
  let cursor = from;

  while (cursor <= to) {
    const end = shiftDays(cursor, CHUNK_DAYS);
    chunks.push({ from: cursor, to: end < to ? end : to });
    cursor = shiftDays(end, 1);
  }

  return chunks;
}

/** SKU-Metriken lassen sich nicht aus der Tagesreihe ableiten, deshalb eine
 *  eigene Abfrage je Zeitraum — der Cache-Schlüssel sind die Argumente. */
export async function getTopSkus(
  from: string,
  to: string,
): Promise<SkuMetrics[]> {
  "use cache";
  cacheLife("ozon");
  cacheTag("ozon-analytics");

  if (!OZON_LIVE) {
    const raw = await loadFixture<AnalyticsResponse>("analytics-sku.json");
    return raw.result.data.map((row) => ({
      sku: row.dimensions[0].id,
      name: row.dimensions[0].name,
      ...toMetrics(row.metrics),
    }));
  }

  const merged = new Map<string, SkuMetrics>();
  // conv_tocart bezieht sich auf Sessions; über Scheiben hinweg wird deshalb
  // dieselbe Rückrechnung wie in sumMetrics benutzt statt Prozente zu mitteln.
  const sessions = new Map<string, number>();

  for (const chunk of chunkRange(from, to)) {
    const raw = await sellerPost<AnalyticsResponse>("/v1/analytics/data", {
      date_from: chunk.from,
      date_to: chunk.to,
      metrics: [...METRIC_KEYS],
      dimension: ["sku"],
      filters: [],
      sort: [{ key: "revenue", order: "DESC" }],
      limit: 1000,
      offset: 0,
    });

    for (const row of raw.result.data) {
      const sku = row.dimensions[0].id;
      const metrics = toMetrics(row.metrics);
      sessions.set(
        sku,
        (sessions.get(sku) ?? 0) +
          (metrics.convToCart > 0 ? metrics.toCart / (metrics.convToCart / 100) : 0),
      );

      const previous = merged.get(sku);
      if (!previous) {
        merged.set(sku, { sku, name: row.dimensions[0].name, ...metrics });
        continue;
      }

      previous.revenue += metrics.revenue;
      previous.orderedUnits += metrics.orderedUnits;
      previous.views += metrics.views;
      previous.searchViews += metrics.searchViews;
      previous.toCart += metrics.toCart;
      previous.returns += metrics.returns;
      previous.cancellations += metrics.cancellations;
    }
  }

  for (const entry of merged.values()) {
    const total = sessions.get(entry.sku) ?? 0;
    entry.convToCart = total > 0 ? (entry.toCart / total) * 100 : 0;
  }

  return [...merged.values()].sort((a, b) => b.revenue - a.revenue);
}

/** `conv_tocart` bezieht sich auf Sessions, nicht auf Aufrufe — die Sessions
 *  lassen sich aber pro Tag zurückrechnen, damit die Summe exakt bleibt
 *  statt ein Mittelwert von Prozentwerten zu sein. */
export function sumMetrics(rows: DailyMetrics[]): Metrics {
  const total = rows.reduce<Metrics>(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      orderedUnits: acc.orderedUnits + row.orderedUnits,
      views: acc.views + row.views,
      searchViews: acc.searchViews + row.searchViews,
      toCart: acc.toCart + row.toCart,
      convToCart: 0,
      returns: acc.returns + row.returns,
      cancellations: acc.cancellations + row.cancellations,
    }),
    {
      revenue: 0,
      orderedUnits: 0,
      views: 0,
      searchViews: 0,
      toCart: 0,
      convToCart: 0,
      returns: 0,
      cancellations: 0,
    },
  );

  const sessions = rows.reduce(
    (acc, row) => acc + (row.convToCart > 0 ? row.toCart / (row.convToCart / 100) : 0),
    0,
  );
  total.convToCart = sessions > 0 ? (total.toCart / sessions) * 100 : 0;

  return total;
}

/** Gebündelt wird vom Ende her: die aktuelle Woche soll voll sein, ein
 *  angeschnittener Rest darf dafür am Anfang stehen. */
export function groupByWeek(rows: DailyMetrics[]): DailyMetrics[] {
  const weeks: DailyMetrics[] = [];
  for (let end = rows.length; end > 0; end -= 7) {
    const chunk = rows.slice(Math.max(end - 7, 0), end);
    weeks.unshift({ date: chunk[0].date, ...sumMetrics(chunk) });
  }
  return weeks;
}

/** Kalendermonate, damit die Beschriftung über Jahre hinweg lesbar bleibt. */
export function groupByMonth(rows: DailyMetrics[]): DailyMetrics[] {
  const months: DailyMetrics[] = [];
  let bucket: DailyMetrics[] = [];

  for (const row of rows) {
    if (bucket.length > 0 && row.date.slice(0, 7) !== bucket[0].date.slice(0, 7)) {
      months.push({ date: `${bucket[0].date.slice(0, 7)}-01`, ...sumMetrics(bucket) });
      bucket = [];
    }
    bucket.push(row);
  }

  if (bucket.length > 0) {
    months.push({ date: `${bucket[0].date.slice(0, 7)}-01`, ...sumMetrics(bucket) });
  }

  return months;
}

export function bucket(
  rows: DailyMetrics[],
  granularity: Granularity,
): DailyMetrics[] {
  if (granularity === "month") return groupByMonth(rows);
  if (granularity === "week") return groupByWeek(rows);
  return rows;
}

export type Comparison = Range & {
  current: DailyMetrics[];
  previous: DailyMetrics[];
  currentTotal: Metrics;
  previousTotal: Metrics;
};

/** Die Vergleichsspanne ist genauso lang und endet am Tag vor dem Start —
 *  über Datumsgrenzen statt über Array-Indizes, damit Lücken in der Reihe den
 *  Vergleich nicht verschieben. */
export function compare(series: DailyMetrics[], range: Range): Comparison {
  const current = series.filter(
    (row) => row.date >= range.from && row.date <= range.to,
  );
  const previousTo = shiftDays(range.from, -1);
  const previousFrom = shiftDays(previousTo, -(range.days - 1));
  const previous = series.filter(
    (row) => row.date >= previousFrom && row.date <= previousTo,
  );

  return {
    ...range,
    current,
    previous,
    currentTotal: sumMetrics(current),
    previousTotal: sumMetrics(previous),
  };
}

/** Prozentuale Veränderung; ohne Basiswert gibt es keine sinnvolle Aussage. */
export function deltaPercent(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
