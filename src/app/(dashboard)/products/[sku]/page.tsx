import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/page-header";
import { Photo } from "@/components/photo";
import { Kpi, KpiGrid } from "@/components/kpi";
import { PriceZoneChip } from "@/components/price-zone";
import { BarList } from "@/components/charts";
import {
  IconCart,
  IconPercent,
  IconRevenue,
  IconStock,
  IconTag,
  IconUnits,
  IconViews,
} from "@/components/icons";
import { getTranslations } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import { RangePicker } from "@/components/range-picker";
import { parseSelection, resolveRange } from "@/lib/period";
import { getProducts } from "@/lib/ozon/catalog";
import { getDailySeries, getTopSkus } from "@/lib/ozon/analytics";

export default async function ProductPage({
  params,
  searchParams,
}: PageProps<"/products/[sku]">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const { sku } = await params;
  const selection = parseSelection(await searchParams);

  const [products, series] = await Promise.all([getProducts(), getDailySeries()]);
  const range = resolveRange(selection, series);
  const topSkus = await getTopSkus(range.from, range.to);
  const product = products.find((candidate) => candidate.sku === sku);

  if (!product) notFound();

  const metrics = topSkus.find((candidate) => candidate.sku === sku) ?? null;
  const payout = product.price - product.commissionValue;
  const discount =
    product.oldPrice > 0
      ? ((product.oldPrice - product.price) / product.oldPrice) * 100
      : 0;

  const facts: { label: string; value: string }[] = [
    { label: t.products.sku, value: product.sku },
    { label: t.products.offerId, value: product.offerId },
    { label: t.products.priceOld, value: f.money(product.oldPrice) },
    { label: t.products.priceMin, value: f.money(product.minPrice) },
    { label: t.products.commission, value: f.moneyExact(product.commissionValue) },
    { label: t.products.payout, value: f.moneyExact(payout) },
    { label: t.products.stockFbo, value: f.integer(product.fboStock) },
    { label: t.products.stockFbs, value: f.integer(product.fbsStock) },
    { label: t.products.volumeWeight, value: f.decimal(product.volumeWeight) },
    { label: t.products.created, value: f.dayMonthYear(product.createdAt) },
    { label: t.products.updated, value: f.dayMonthYear(product.updatedAt) },
  ];

  return (
    <>
      <Link
        href="/products"
        className="mb-3 inline-block text-xs text-dim no-underline hover:text-acc"
      >
        ← {t.products.title}
      </Link>

      <PageHeader
        title={product.name}
        description={`${product.offerId} · ${product.statusName}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <PriceZoneChip zone={product.priceZone} t={t} />
            <RangePicker
              path={`/products/${product.sku}`}
              selection={selection}
              range={range}
              t={t}
              f={f}
            />
          </div>
        }
      />

      <KpiGrid>
        <Kpi
          icon={<IconTag />}
          label={t.products.priceCurrent}
          value={f.money(product.price)}
          sub={discount > 0 ? `−${f.percent(discount)}` : undefined}
        />
        <Kpi
          icon={<IconPercent />}
          label={t.products.commission}
          value={f.percent(product.commissionPercent)}
          sub={f.money(payout)}
          hint={t.products.payout}
        />
        <Kpi
          icon={<IconStock />}
          label={t.products.colStock}
          value={f.integer(product.fboStock + product.fbsStock)}
          sub={`${t.products.stockFbo} ${f.integer(product.fboStock)} · ${t.products.stockFbs} ${f.integer(product.fbsStock)}`}
        />
        <Kpi
          icon={<IconTag />}
          label={t.products.colIndex}
          value={product.priceIndex > 0 ? f.ratio(product.priceIndex) : "—"}
          sub={
            product.competitorMinPrice > 0
              ? f.money(product.competitorMinPrice)
              : undefined
          }
        />
      </KpiGrid>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Panel title={t.products.colProduct}>
          {product.image ? (
            <Photo
              id="photo-main"
              src={product.image}
              alt={product.name}
              size={480}
              className="w-full"
              t={t}
            />
          ) : (
            <div className="aspect-square w-full rounded-lg bg-raised" />
          )}
          {product.images.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {product.images.slice(0, 8).map((src, index) => (
                <Photo
                  key={src}
                  id={`photo-${index}`}
                  src={src}
                  alt={product.name}
                  size={56}
                  className="h-14 w-14"
                  t={t}
                />
              ))}
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={t.products.metricsPeriod}>
            {metrics ? (
              <BarList
                items={[
                  {
                    id: "views",
                    label: t.kpi.views,
                    value: f.compact(metrics.views),
                    share: 1,
                  },
                  {
                    id: "searchViews",
                    label: t.kpi.searchViews,
                    value: f.compact(metrics.searchViews),
                    share: metrics.views > 0 ? metrics.searchViews / metrics.views : 0,
                  },
                  {
                    id: "toCart",
                    label: t.kpi.toCart,
                    value: f.integer(metrics.toCart),
                    share: metrics.views > 0 ? metrics.toCart / metrics.views : 0,
                  },
                  {
                    id: "units",
                    label: t.kpi.units,
                    value: f.integer(metrics.orderedUnits),
                    share:
                      metrics.views > 0 ? metrics.orderedUnits / metrics.views : 0,
                  },
                ]}
              />
            ) : (
              <p className="text-sm text-dim">{t.common.noData}</p>
            )}
          </Panel>

          {metrics && (
            <KpiGrid>
              <Kpi
                icon={<IconRevenue />}
                label={t.kpi.revenue}
                value={f.money(metrics.revenue)}
              />
              <Kpi
                icon={<IconUnits />}
                label={t.kpi.units}
                value={f.integer(metrics.orderedUnits)}
              />
              <Kpi
                icon={<IconCart />}
                label={t.kpi.convToCart}
                value={f.percent(metrics.convToCart)}
              />
              <Kpi
                icon={<IconViews />}
                label={t.kpi.views}
                value={f.compact(metrics.views)}
              />
            </KpiGrid>
          )}

          <Panel title={t.common.total}>
            <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="text-dim">{fact.label}</dt>
                  <dd className="tabular-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
