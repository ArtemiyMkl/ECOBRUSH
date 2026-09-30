import { cacheLife, cacheTag } from "next/cache";
import { OZON_LIVE, sellerPost } from "./client";
import { loadFixture } from "./fixtures";
import { moscowDay, shiftDays } from "@/lib/period";
import type { Posting, PostingGroup, PostingItem, PostingScheme } from "./types";

export const ORDERS_TAG = "ozon-orders";

/** Wie weit die Liste zurückreicht. Kurz, weil der Abschnitt den laufenden
 *  Betrieb zeigt — die Historie steht in der Analytik. */
const LOOKBACK_DAYS = 14;

/** Tagesgrenzen statt Zeitstempel: so bleibt der Cache-Schlüssel den Tag über
 *  gleich, anstatt bei jeder Anfrage ein neuer zu sein. */
export function ordersWindow(): { since: string; to: string } {
  const today = moscowDay(new Date());
  return {
    since: `${shiftDays(today, -(LOOKBACK_DAYS - 1))}T00:00:00.000Z`,
    to: `${shiftDays(today, 1)}T00:00:00.000Z`,
  };
}

/** Das Fenster eines einzelnen Moskauer Tages. Der Filter rechnet in UTC, und
 *  Moskau liegt seit 2014 ganzjährig drei Stunden davor — der Tag beginnt also
 *  am Vorabend um 21:00 UTC. Vierzehn Tage zu holen, um einen zu zeichnen, war
 *  der teuerste Abruf der Startseite. */
export function dayWindow(day: string): { since: string; to: string } {
  return {
    since: `${shiftDays(day, -1)}T21:00:00.000Z`,
    to: `${day}T21:00:00.000Z`,
  };
}

/** Wie weit die Stundenkurve zurückreichen kann: die Posting-Endpunkte halten
 *  nicht beliebig viel Geschichte vor. */
export const HOURLY_LOOKBACK_DAYS = LOOKBACK_DAYS;

const MOSCOW_HOUR = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Moscow",
  hour: "2-digit",
  hour12: false,
});

export type HourlyTotals = { hour: string; revenue: number; units: number };

/** Der Tagesverlauf kommt aus den Aufträgen: die Analytik kennt keine Stunden,
 *  und ein einzelner Tag ist als eine Zahl keine Entwicklung. Für heute endet
 *  die Reihe an der laufenden Stunde — sonst zöge sich eine Nulllinie bis
 *  Mitternacht und die Kurve sähe aus wie ein Einbruch. */
export function hourlyTotals(
  postings: Posting[],
  day: string,
): HourlyTotals[] {
  const now = new Date();
  const lastHour =
    day === moscowDay(now) ? Number(MOSCOW_HOUR.format(now)) : 23;

  const rows: HourlyTotals[] = Array.from(
    { length: lastHour + 1 },
    (_, hour) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      revenue: 0,
      units: 0,
    }),
  );

  for (const posting of postings) {
    if (moscowDay(posting.placedAt) !== day) continue;
    const row = rows[Number(MOSCOW_HOUR.format(new Date(posting.placedAt)))];
    if (!row) continue;
    row.revenue += posting.total;
    row.units += posting.units;
  }

  return rows;
}

const GROUPS: Record<PostingGroup, string[]> = {
  new: [
    "acceptance_in_progress",
    "awaiting_approve",
    "awaiting_packaging",
    "awaiting_registration",
  ],
  shipping: [
    "arbitration",
    "awaiting_deliver",
    "client_arbitration",
    "delivering",
    "driver_pickup",
    "sent_by_seller",
  ],
  done: ["delivered"],
  cancelled: ["cancelled", "not_accepted"],
};

const GROUP_BY_STATUS = new Map(
  Object.entries(GROUPS).flatMap(([group, statuses]) =>
    statuses.map((status) => [status, group as PostingGroup] as const),
  ),
);

type RawProduct = {
  sku: number;
  name: string;
  quantity: number;
  offer_id: string;
  price: string;
};

type RawPosting = {
  posting_number: string;
  order_number: string;
  status: string;
  in_process_at: string;
  shipment_date?: string;
  products: RawProduct[];
  analytics_data?: {
    city?: string;
    delivery_type?: string;
    /** FBO nennt es `warehouse_name`, FBS `warehouse`. */
    warehouse_name?: string;
    warehouse?: string;
    is_legal?: boolean;
  };
};

function normalizeItem(product: RawProduct): PostingItem {
  return {
    sku: String(product.sku),
    offerId: product.offer_id,
    name: product.name,
    quantity: product.quantity,
    price: Number.parseFloat(product.price),
  };
}

function normalize(raw: RawPosting, scheme: PostingScheme): Posting {
  const items = raw.products.map(normalizeItem);
  const analytics = raw.analytics_data ?? {};

  return {
    postingNumber: raw.posting_number,
    orderNumber: raw.order_number,
    scheme,
    status: raw.status,
    group: GROUP_BY_STATUS.get(raw.status) ?? "shipping",
    placedAt: raw.in_process_at,
    shipmentDate: raw.shipment_date ?? null,
    city: analytics.city ?? "",
    warehouse: analytics.warehouse_name ?? analytics.warehouse ?? "",
    deliveryType: analytics.delivery_type ?? "",
    isLegal: analytics.is_legal ?? false,
    items,
    units: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}

type FboResponse = { result: RawPosting[] };
type FbsResponse = { result: { postings: RawPosting[] } };

/** Beide Schemata in einer Liste. Anders als die Analytik haben die
 *  Posting-Endpunkte weiche Limits, deshalb darf der Cache kurz leben. */
export async function getPostings(
  since: string,
  to: string,
): Promise<Posting[]> {
  "use cache";
  cacheLife("live");
  cacheTag(ORDERS_TAG);

  const body = {
    dir: "DESC",
    filter: { since, to },
    limit: 1000,
    offset: 0,
    translit: true,
    with: { analytics_data: true, financial_data: false },
  };

  const [fbo, fbs] = await Promise.all([
    OZON_LIVE
      ? sellerPost<FboResponse>("/v2/posting/fbo/list", body)
      : loadFixture<FboResponse>("orders-fbo.json"),
    OZON_LIVE
      ? sellerPost<FbsResponse>("/v3/posting/fbs/list", body)
      : loadFixture<FbsResponse>("orders-fbs.json"),
  ]);

  return [
    ...fbo.result.map((raw) => normalize(raw, "fbo")),
    ...fbs.result.postings.map((raw) => normalize(raw, "fbs")),
  ].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}
