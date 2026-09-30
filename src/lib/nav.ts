import type { Dictionary } from "@/lib/i18n/server";

export type NavKey = keyof Dictionary["nav"];

/** Reihenfolge der Seitenleiste. Die Beschriftung kommt aus dem Wörterbuch,
 *  damit der Sprachwechsel auch die Navigation trifft. */
export const NAV_ITEMS: { href: string; key: NavKey }[] = [
  { href: "/", key: "home" },
  { href: "/products", key: "products" },
  { href: "/analytics", key: "analytics" },
  { href: "/customers", key: "customers" },
  { href: "/promotion", key: "promotion" },
  { href: "/prices", key: "prices" },
  { href: "/fbo", key: "fbo" },
  { href: "/finance", key: "finance" },
];
