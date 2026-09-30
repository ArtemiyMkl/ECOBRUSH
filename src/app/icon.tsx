import { BRAND_GREEN, MARK_KNOCKOUT_PATH, MARK_VIEWBOX } from "@/components/brand-mark";

export const contentType = "image/svg+xml";

/** Der Reiter bekommt dieselbe Kontur wie die Seitenleiste — als Vektor, damit
 *  der Browser bei jeder Grösse selbst rastert, statt eine PNG hochzurechnen.
 *  Generiert statt als `icon.svg` abgelegt, weil die Geometrie nur an einer
 *  Stelle stehen soll. */
export default function Icon() {
  return new Response(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"><path fill="${BRAND_GREEN}" fill-rule="evenodd" d="${MARK_KNOCKOUT_PATH}"/></svg>`,
    { headers: { "Content-Type": contentType } },
  );
}
