import { cacheLife, cacheTag } from "next/cache";
import { OZON_LIVE, sellerPost } from "./client";
import { loadFixture } from "./fixtures";
import type { PriceZone, ProductDetail, SellerRating } from "./types";

type ListResponse = {
  result: {
    items: { product_id: number; offer_id: string; sku: number }[];
    total: number;
    last_id: string;
  };
};

type IndexData = {
  minimal_price: string;
  minimal_price_currency: string;
  price_index_value: number;
};

type InfoItem = {
  id: number;
  name: string;
  offer_id: string;
  sku: number;
  is_archived: boolean;
  barcodes: string[] | null;
  description_category_id: number;
  created_at: string;
  updated_at: string;
  images: string[];
  primary_image: string[];
  price: string;
  old_price: string;
  min_price: string;
  volume_weight: number;
  commissions: { percent: number; value: number; sale_schema: string }[];
  stocks: {
    stocks: { present: number; reserved: number; source: string }[];
  };
  statuses: { status_name: string };
  price_indexes: {
    color_index: string;
    external_index_data: IndexData;
    ozon_index_data: IndexData;
    self_marketplaces_index_data: IndexData;
  };
};

type InfoResponse = { items: InfoItem[] };

const ZONES: Record<string, PriceZone> = {
  COLOR_INDEX_SUPER: "super",
  COLOR_INDEX_GREEN: "green",
  COLOR_INDEX_YELLOW: "yellow",
  COLOR_INDEX_RED: "red",
};

function num(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Ozon füllt je Marktplatz-Quelle unterschiedlich: die erste Quelle mit einem
 *  echten Vergleichspreis gewinnt. */
function competitorIndex(indexes: InfoItem["price_indexes"]) {
  for (const data of [
    indexes.external_index_data,
    indexes.self_marketplaces_index_data,
    indexes.ozon_index_data,
  ]) {
    if (data?.price_index_value) {
      return { value: data.price_index_value, minPrice: num(data.minimal_price) };
    }
  }
  return { value: 0, minPrice: 0 };
}

function normalize(item: InfoItem): ProductDetail {
  const stocks = item.stocks?.stocks ?? [];
  const bySource = (source: string) =>
    stocks
      .filter((s) => s.source === source)
      .reduce((acc, s) => acc + s.present, 0);

  const commission =
    item.commissions?.find((c) => c.sale_schema === "FBO") ??
    item.commissions?.[0];
  const index = competitorIndex(item.price_indexes);

  return {
    offerId: item.offer_id,
    sku: String(item.sku),
    productId: item.id,
    name: item.name,
    price: num(item.price),
    oldPrice: num(item.old_price),
    minPrice: num(item.min_price),
    image: item.primary_image?.[0] ?? item.images?.[0] ?? null,
    images: item.images ?? [],
    statusName: item.statuses?.status_name ?? "",
    isArchived: item.is_archived,
    fboStock: bySource("fbo"),
    fbsStock: bySource("fbs"),
    reserved: stocks.reduce((acc, s) => acc + s.reserved, 0),
    commissionPercent: commission?.percent ?? 0,
    commissionValue: commission?.value ?? 0,
    priceZone: ZONES[item.price_indexes?.color_index] ?? "none",
    priceIndex: index.value,
    competitorMinPrice: index.minPrice,
    barcodes: item.barcodes ?? [],
    categoryId: item.description_category_id,
    volumeWeight: item.volume_weight,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

async function fetchAllOfferIds(): Promise<string[]> {
  const ids: string[] = [];
  let lastId = "";

  // Der Katalog hat gut 400 Artikel — die Schleife bricht ab, sobald Ozon
  // eine kürzere Seite liefert.
  for (let page = 0; page < 20; page++) {
    const res = await sellerPost<ListResponse>("/v3/product/list", {
      filter: { visibility: "ALL" },
      last_id: lastId,
      limit: 1000,
    });
    ids.push(...res.result.items.map((i) => i.offer_id));
    lastId = res.result.last_id;
    if (!lastId || res.result.items.length === 0) break;
  }

  return ids;
}

export async function getProducts(): Promise<ProductDetail[]> {
  "use cache";
  cacheLife("ozon");
  cacheTag("ozon-catalog");

  if (!OZON_LIVE) {
    const raw = await loadFixture<InfoResponse>("products-info.json");
    return raw.items.map(normalize);
  }

  const offerIds = await fetchAllOfferIds();
  const items: InfoItem[] = [];

  for (let i = 0; i < offerIds.length; i += 100) {
    const batch = await sellerPost<InfoResponse>("/v3/product/info/list", {
      offer_id: offerIds.slice(i, i + 100),
    });
    items.push(...batch.items);
  }

  return items.map(normalize);
}

type RatingResponse = {
  groups: {
    items: { rating: string; current_value: number }[];
  }[];
  premium_plus: boolean;
  penalty_score_exceeded: boolean;
  localization_index: { localization_percentage: number };
};

export async function getSellerRating(): Promise<SellerRating> {
  "use cache";
  cacheLife("ozon");
  cacheTag("ozon-rating");

  const raw = OZON_LIVE
    ? await sellerPost<RatingResponse>("/v1/rating/summary", {})
    : await loadFixture<RatingResponse>("rating-summary.json");

  const values = new Map(
    raw.groups.flatMap((g) => g.items.map((i) => [i.rating, i.current_value])),
  );
  const zone = (key: string) => (values.get(key) ?? 0) * 100;

  return {
    productScore: values.get("rating_review_avg_score_total") ?? 0,
    localizationPercent: raw.localization_index?.localization_percentage ?? 0,
    premiumPlus: raw.premium_plus,
    penaltyExceeded: raw.penalty_score_exceeded,
    priceZoneShare: {
      super: zone("rating_price_super"),
      green: zone("rating_price_green"),
      yellow: zone("rating_price_yellow"),
      red: zone("rating_price_red"),
    },
  };
}
