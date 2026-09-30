import type { Dictionary } from "@/lib/i18n/server";
import type { PriceZone } from "@/lib/ozon/types";

const TONES: Record<PriceZone, string | undefined> = {
  super: "ok",
  green: "ok",
  yellow: "warn",
  red: "bad",
  none: undefined,
};

export const PRICE_ZONES: PriceZone[] = [
  "super",
  "green",
  "yellow",
  "red",
  "none",
];

export function priceZoneLabel(zone: PriceZone, t: Dictionary): string {
  return {
    super: t.products.indexSuper,
    green: t.products.indexGreen,
    yellow: t.products.indexYellow,
    red: t.products.indexRed,
    none: t.products.indexNone,
  }[zone];
}

export function PriceZoneChip({
  zone,
  t,
}: {
  zone: PriceZone;
  t: Dictionary;
}) {
  return (
    <span className="chip" data-tone={TONES[zone]}>
      {priceZoneLabel(zone, t)}
    </span>
  );
}
