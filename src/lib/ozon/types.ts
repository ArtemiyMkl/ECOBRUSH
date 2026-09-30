/** Reihenfolge der Metriken in jeder Analytics-Anfrage. Ozon antwortet mit
 *  einem reinen Zahlenarray, die Zuordnung hängt allein an dieser Liste. */
export const METRIC_KEYS = [
  "revenue",
  "ordered_units",
  "hits_view",
  "hits_view_search",
  "hits_tocart",
  "conv_tocart",
  "returns",
  "cancellations",
] as const;

export type Metrics = {
  revenue: number;
  orderedUnits: number;
  views: number;
  searchViews: number;
  toCart: number;
  /** Prozentpunkte, wie Ozon sie liefert — nicht als Anteil. */
  convToCart: number;
  returns: number;
  cancellations: number;
};

export type DailyMetrics = Metrics & { date: string };

export type SkuMetrics = Metrics & { sku: string; name: string };

export type PriceZone = "super" | "green" | "yellow" | "red" | "none";

export type ProductSummary = {
  offerId: string;
  sku: string;
  productId: number;
  name: string;
  price: number;
  oldPrice: number;
  minPrice: number;
  image: string | null;
  statusName: string;
  isArchived: boolean;
  fboStock: number;
  fbsStock: number;
  reserved: number;
  commissionPercent: number;
  commissionValue: number;
  priceZone: PriceZone;
  priceIndex: number;
  competitorMinPrice: number;
};

export type ProductDetail = ProductSummary & {
  images: string[];
  barcodes: string[];
  categoryId: number;
  volumeWeight: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatKind = "buyer" | "system";

export type ChatSummary = {
  id: string;
  kind: ChatKind;
  rawType: string;
  status: string;
  createdAt: string;
  unreadCount: number;
};

export type ChatAuthor = "customer" | "seller" | "support";

export type ChatMessage = {
  id: string;
  author: ChatAuthor;
  createdAt: string;
  text: string;
  images: string[];
  sku: string;
};

export type CampaignState = "running" | "inactive" | "finished" | "archived";

export type Campaign = {
  id: string;
  title: string;
  state: CampaignState;
  objectType: string;
  dailyBudget: number;
  weeklyBudget: number;
  createdAt: string;
};

export type DailySpend = { date: string; spend: number };

export type CampaignSpend = { campaignId: string; title: string; spend: number };

/** `entries` ist die feinste Auflösung des Ausgabenreports — Kampagne × Tag.
 *  Jeder Zeitraum lässt sich daraus zusammenrechnen, ohne neu abzurufen. */
export type AdSpend = {
  byDay: DailySpend[];
  entries: { campaignId: string; title: string; date: string; spend: number }[];
};

export type PostingScheme = "fbo" | "fbs";

/** Ozon kennt über zwanzig Status; die Übersicht braucht vier Spalten. */
export type PostingGroup = "new" | "shipping" | "done" | "cancelled";

export type PostingItem = {
  sku: string;
  offerId: string;
  name: string;
  quantity: number;
  price: number;
};

export type Posting = {
  postingNumber: string;
  orderNumber: string;
  scheme: PostingScheme;
  status: string;
  group: PostingGroup;
  /** `in_process_at` — der einzige Zeitstempel, den FBO und FBS beide führen.
   *  FBS liefert kein `created_at`. */
  placedAt: string;
  /** Nur FBS: Frist für die Übergabe an die Logistik. */
  shipmentDate: string | null;
  city: string;
  warehouse: string;
  deliveryType: string;
  isLegal: boolean;
  items: PostingItem[];
  units: number;
  total: number;
};

export type SellerRating = {
  productScore: number;
  localizationPercent: number;
  premiumPlus: boolean;
  penaltyExceeded: boolean;
  priceZoneShare: Record<"super" | "green" | "yellow" | "red", number>;
};
