import { cacheLife, cacheTag } from "next/cache";
import { OZON_PERF_LIVE, perfGet, perfGetCsv } from "./client";
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

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Der Ausgaben-Report ist CSV: Semikolon-getrennt, Dezimalkomma,
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

/** Wie bei der Analytik wird der ganze Verlauf in Scheiben geholt und danach im
 *  Speicher auf den gewählten Zeitraum eingeschränkt. Der Ausgaben-Report lässt
 *  höchstens 61 Tage zwischen den Enden zu — ab 62 antwortet er
 *  `max statistics period: 62 days`. Zwölf Scheiben decken rund zwei Jahre. */
const CHUNK_DAYS = 61;
const MAX_CHUNKS = 12;

/** Eine leere Scheibe heißt nicht, dass die Geschichte zu Ende ist: bei 61 Tagen
 *  reicht eine Werbepause, um eine zu leeren. Erst zwei leere hintereinander
 *  sind ein Ende. */
const EMPTY_CHUNKS_UNTIL_STOP = 2;

export async function getAdSpend(): Promise<AdSpend> {
  "use cache";
  cacheLife("ozon");
  cacheTag("ozon-ads");

  const entries: AdSpend["entries"] = [];

  if (OZON_PERF_LIVE) {
    let to = isoDay(1);
    let empty = 0;

    for (let chunk = 0; chunk < MAX_CHUNKS; chunk++) {
      const d = new Date(`${to}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() - CHUNK_DAYS);
      const from = d.toISOString().slice(0, 10);

      const rows = parseExpenseCsv(
        await perfGetCsv(
          `/api/client/statistics/expense?dateFrom=${from}&dateTo=${to}`,
        ),
      );
      entries.unshift(...rows);

      empty = rows.length === 0 ? empty + 1 : 0;
      if (empty >= EMPTY_CHUNKS_UNTIL_STOP) break;

      d.setUTCDate(d.getUTCDate() - 1);
      to = d.toISOString().slice(0, 10);
    }
  } else {
    entries.push(...parseExpenseCsv(await loadFixtureText("ads-expense.csv")));
  }

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
