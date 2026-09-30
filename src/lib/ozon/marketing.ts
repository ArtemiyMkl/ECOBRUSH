import { cacheLife, cacheTag } from "next/cache";
import { moscowDay, shiftDays } from "@/lib/period";
import { OZON_PERF_LIVE, perfGet } from "./client";
import { loadFixture, loadFixtureText } from "./fixtures";
import type {
  AdSpend,
  Campaign,
  CampaignSpend,
  CampaignState,
} from "./types";

type CampaignResponse = {
  list: {
    id: string;
    title: string;
    state: string;
    advObjectType: string;
    dailyBudget: string;
    weeklyBudget: string;
    createdAt: string;
  }[];
};

const STATES: Record<string, CampaignState> = {
  CAMPAIGN_STATE_RUNNING: "running",
  CAMPAIGN_STATE_INACTIVE: "inactive",
  CAMPAIGN_STATE_FINISHED: "finished",
  CAMPAIGN_STATE_ARCHIVED: "archived",
};

/** Performance liefert Budgets als Mikro-Rubel-Strings. */
function budget(value: string): number {
  return Number.parseInt(value || "0", 10) / 1_000_000;
}

export async function getCampaigns(): Promise<Campaign[]> {
  "use cache";
  cacheLife("ozon");
  cacheTag("ozon-ads");

  const raw = OZON_PERF_LIVE
    ? await perfGet<CampaignResponse>("/api/client/campaign")
    : await loadFixture<CampaignResponse>("ads-campaigns.json");

  return raw.list.map((c) => ({
    id: c.id,
    title: c.title,
    state: STATES[c.state] ?? "inactive",
    objectType: c.advObjectType,
    dailyBudget: budget(c.dailyBudget),
    weeklyBudget: budget(c.weeklyBudget),
    createdAt: c.createdAt,
  }));
}

/** Der Ausgaben-Report (`/statistics/expense`, CSV) bucht einen Tag verzögert und
 *  kennt den laufenden Tag gar nicht — die Tagesstatistik dagegen zählt live mit
 *  und ist für abgeschlossene Tage auf die Kopeke deckungsgleich. */
type DailyStatsResponse = {
  rows: { id: string; title: string; date: string; moneySpent: string }[];
};

/** Beträge kommen als Dezimalkomma-Strings. */
function parseStats(raw: DailyStatsResponse): AdSpend["entries"] {
  return raw.rows.flatMap((row) => {
    const spend = Number.parseFloat(row.moneySpent.replace(",", "."));
    if (!Number.isFinite(spend)) return [];
    return [{ campaignId: row.id, title: row.title, date: row.date, spend }];
  });
}

async function fetchSpend(from: string, to: string): Promise<AdSpend["entries"]> {
  return parseStats(
    await perfGet<DailyStatsResponse>(
      `/api/client/statistics/daily/json?dateFrom=${from}&dateTo=${to}`,
    ),
  );
}

/** Die Tagesstatistik lässt höchstens 62 Tage zwischen den Enden zu — ab 63
 *  antwortet sie `max statistics period: 62 days`. Zwölf Scheiben decken rund
 *  zwei Jahre. */
const CHUNK_DAYS = 61;
const MAX_CHUNKS = 12;

/** Eine leere Scheibe heißt nicht, dass die Geschichte zu Ende ist: bei 61 Tagen
 *  reicht eine Werbepause, um eine zu leeren. Erst zwei leere hintereinander
 *  sind ein Ende. */
const EMPTY_CHUNKS_UNTIL_STOP = 2;

/** Alles vor `until` ist abgerechnet und ändert sich nicht mehr. Der Schnitt
 *  liegt auf einem Monatsersten, also bleibt der Schlüssel einen Monat lang
 *  derselbe — die zwölf Scheiben laufen einmal im Monat statt bei jedem
 *  Cache-Ablauf. */
async function spendBefore(until: string): Promise<AdSpend["entries"]> {
  "use cache";
  cacheLife("history");
  cacheTag("ozon-ads");

  if (!OZON_PERF_LIVE) {
    return parseExpenseCsv(await loadFixtureText("ads-expense.csv")).filter(
      (entry) => entry.date < until,
    );
  }

  const entries: AdSpend["entries"] = [];
  let to = shiftDays(until, -1);
  let empty = 0;

  for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
    const from = shiftDays(to, -CHUNK_DAYS);
    const rows = await fetchSpend(from, to);
    entries.unshift(...rows);

    empty = rows.length === 0 ? empty + 1 : 0;
    if (empty >= EMPTY_CHUNKS_UNTIL_STOP) break;

    to = shiftDays(from, -1);
  }

  return entries;
}

/** Der laufende Monat — höchstens 31 Tage, also eine einzige Anfrage. Sie ist
 *  das Einzige, was tagsüber wirklich neu geholt werden muss. */
async function spendSince(from: string, to: string): Promise<AdSpend["entries"]> {
  "use cache";
  cacheLife("live");
  cacheTag("ozon-ads");

  if (!OZON_PERF_LIVE) {
    return parseExpenseCsv(await loadFixtureText("ads-expense.csv")).filter(
      (entry) => entry.date >= from && entry.date <= to,
    );
  }

  return fetchSpend(from, to);
}

/** Der Fixture-Report liegt als CSV vor: Semikolon-getrennt, Dezimalkomma,
 *  Spalten ID;Datum;Name;Ausgabe;Bonus-Ausgabe;Kontoausgabe. */
function parseExpenseCsv(csv: string): AdSpend["entries"] {
  const entries: AdSpend["entries"] = [];

  for (const line of csv.split("\n").slice(1)) {
    const cols = line.trim().split(";");
    if (cols.length < 4) continue;

    const [campaignId, date, title, amount] = cols;
    const spend = Number.parseFloat(amount.replace(",", "."));
    if (!Number.isFinite(spend)) continue;

    entries.push({ campaignId, title, date, spend });
  }

  return entries;
}

/** Die Uhr wird hier gelesen, nicht in den Cache-Funktionen: so bleibt deren
 *  Schlüssel ein festes Datum statt eines Zeitstempels. */
export async function getAdSpend(): Promise<AdSpend> {
  const today = moscowDay(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;

  const [history, month] = await Promise.all([
    spendBefore(monthStart),
    spendSince(monthStart, today),
  ]);

  const entries = [...history, ...month];

  const byDay = new Map<string, number>();
  for (const entry of entries) {
    byDay.set(entry.date, (byDay.get(entry.date) ?? 0) + entry.spend);
  }

  return {
    entries,
    byDay: [...byDay.entries()]
      .map(([date, spend]) => ({ date, spend }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Kampagnenausgaben innerhalb eines Zeitraums, absteigend. */
export function campaignSpend(
  ads: AdSpend,
  from: string,
  to: string,
): CampaignSpend[] {
  const merged = new Map<string, CampaignSpend>();

  for (const entry of ads.entries) {
    if (entry.date < from || entry.date > to) continue;
    const previous = merged.get(entry.campaignId);
    if (previous) {
      previous.spend += entry.spend;
      continue;
    }
    merged.set(entry.campaignId, {
      campaignId: entry.campaignId,
      title: entry.title,
      spend: entry.spend,
    });
  }

  return [...merged.values()].sort((a, b) => b.spend - a.spend);
}
