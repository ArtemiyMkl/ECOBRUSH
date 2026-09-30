import Image from "next/image";
import Link from "next/link";
import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { SegLinks } from "@/components/seg-links";
import { Kpi, KpiGrid } from "@/components/kpi";
import {
  PRICE_ZONES,
  PriceZoneChip,
  priceZoneLabel,
} from "@/components/price-zone";
import { IconPercent, IconStock, IconTag, IconUnits } from "@/components/icons";
import { getTranslations } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import { RangePicker } from "@/components/range-picker";
import {
  parseSelection,
  resolveRange,
  selectionParams,
  withParams,
} from "@/lib/period";
import { getProducts } from "@/lib/ozon/catalog";
import { getDailySeries, getTopSkus } from "@/lib/ozon/analytics";
import type { PriceZone } from "@/lib/ozon/types";

function parseZone(value: string | string[] | undefined): PriceZone | null {
  return PRICE_ZONES.find((zone) => zone === value) ?? null;
}

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const zone = parseZone(params.z);
  // Der Bestandsfilter ist der Weg, den die Warnung auf der Startseite nimmt.
  const outOnly = params.s === "out";
  const selection = parseSelection(params);

  const [products, series] = await Promise.all([getProducts(), getDailySeries()]);
  const range = resolveRange(selection, series);
  const topSkus = await getTopSkus(range.from, range.to);
  const revenueBySku = new Map(topSkus.map((sku) => [sku.sku, sku.revenue]));

  const needle = query.toLowerCase();
  const visible = products
    .filter((product) => !zone || product.priceZone === zone)
    .filter(
      (product) =>
        !outOnly ||
        (!product.isArchived && product.fboStock + product.fbsStock === 0),
    )
    .filter(
      (product) =>
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.offerId.toLowerCase().includes(needle) ||
        product.sku.includes(needle),
    )
    .sort(
      (a, b) =>
        (revenueBySku.get(b.sku) ?? 0) - (revenueBySku.get(a.sku) ?? 0) ||
        a.offerId.localeCompare(b.offerId),
    );

  const active = products.filter((product) => !product.isArchived);
  const outOfStock = active.filter(
    (product) => product.fboStock + product.fbsStock === 0,
  );
  const redZone = products.filter((product) => product.priceZone === "red");
  const avgCommission =
    active.length > 0
      ? active.reduce((acc, product) => acc + product.commissionPercent, 0) /
        active.length
      : 0;

  return (
    <>
      <PageHeader
        title={t.products.title}
        description={t.products.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <RangePicker
              path="/products"
              selection={selection}
              range={range}
              keep={{
                q: query || undefined,
                z: zone ?? undefined,
                s: outOnly ? "out" : undefined,
              }}
              t={t}
              f={f}
            />
            <form className="flex items-center gap-2">
              {zone && <input type="hidden" name="z" value={zone} />}
              {outOnly && <input type="hidden" name="s" value="out" />}
              {Object.entries(selectionParams(selection)).map(
                ([name, value]) =>
                  value && (
                    <input key={name} type="hidden" name={name} value={value} />
                  ),
              )}
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder={t.products.searchPlaceholder}
                aria-label={t.common.search}
                className="field w-56 px-3 py-1.5 text-sm"
              />
              <button type="submit" className="btn btn-quiet px-3 py-1.5 text-sm">
                {t.common.search}
              </button>
            </form>
          </div>
        }
      />

      <KpiGrid>
        <Kpi
          icon={<IconUnits />}
          label={t.products.title}
          value={f.integer(active.length)}
          sub={`${t.common.of} ${f.integer(products.length)}`}
        />
        <Kpi
          icon={<IconStock />}
          label={t.kpi.outOfStock}
          value={f.integer(outOfStock.length)}
          href={withParams("/products", {
            ...selectionParams(selection),
            s: "out",
          })}
        />
        <Kpi
          icon={<IconTag />}
          label={t.products.indexRed}
          value={f.integer(redZone.length)}
          href={withParams("/products", {
            ...selectionParams(selection),
            z: "red",
          })}
        />
        <Kpi
          icon={<IconPercent />}
          label={t.products.commission}
          value={f.percent(avgCommission)}
        />
      </KpiGrid>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegLinks
          options={[
            {
              href: withParams("/products", {
                ...selectionParams(selection),
                q: query || undefined,
              }),
              label: t.common.all,
              active: zone === null && !outOnly,
            },
            ...PRICE_ZONES.map((candidate) => ({
              href: withParams("/products", {
                ...selectionParams(selection),
                q: query || undefined,
                z: candidate,
              }),
              label: priceZoneLabel(candidate, t),
              active: zone === candidate,
            })),
            {
              href: withParams("/products", {
                ...selectionParams(selection),
                q: query || undefined,
                s: "out",
              }),
              label: t.kpi.outOfStock,
              active: outOnly,
            },
          ]}
        />
        <span className="text-xs text-dim">
          {f.integer(visible.length)} {t.common.of} {f.integer(products.length)}
        </span>
      </div>

      <Panel title={t.products.title} className="mt-4">
        {visible.length === 0 ? (
          <EmptyState>{t.common.noData}</EmptyState>
        ) : (
          <div className="scroll-x -mx-4 px-4">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-3">{t.products.colProduct}</th>
                  <th className="py-2 pr-3 text-right">{t.products.colPrice}</th>
                  <th className="py-2 pr-3 text-right">{t.products.colStock}</th>
                  <th className="py-2 pr-3">{t.products.colIndex}</th>
                  <th className="py-2 pr-3 text-right">{t.kpi.revenue}</th>
                  <th className="py-2">{t.products.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((product) => (
                  <tr key={product.sku}>
                    <td className="py-2 pr-3">
                      <Link
                        href={withParams(
                          `/products/${product.sku}`,
                          selectionParams(selection),
                        )}
                        className="flex items-center gap-3 text-txt no-underline hover:text-acc"
                      >
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            width={36}
                            height={36}
                            className="h-9 w-9 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="h-9 w-9 shrink-0 rounded-md bg-raised" />
                        )}
                        <span className="min-w-0">
                          <span className="block max-w-[26rem] truncate">
                            {product.name}
                          </span>
                          <span className="block text-xs text-dim">
                            {product.offerId}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {f.money(product.price)}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {f.integer(product.fboStock + product.fbsStock)}
                    </td>
                    <td className="py-2 pr-3">
                      <PriceZoneChip zone={product.priceZone} t={t} />
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {revenueBySku.has(product.sku)
                        ? f.money(revenueBySku.get(product.sku)!)
                        : "—"}
                    </td>
                    <td className="py-2 text-xs text-dim">
                      {product.statusName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
