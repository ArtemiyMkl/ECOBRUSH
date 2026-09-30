import Link from "next/link";
import { PageHeader, Panel } from "@/components/page-header";
import { RangePicker } from "@/components/range-picker";
import { BarList, Legend, LineChart } from "@/components/charts";
import { Delta, Kpi, KpiGrid, MoreMetrics } from "@/components/kpi";
import {
  IconAd,
  IconAlert,
  IconCancel,
  IconCart,
  IconChat,
  IconGlobe,
  IconPercent,
  IconRevenue,
  IconReturn,
  IconSearch,
  IconStar,
  IconStock,
  IconUnits,
  IconViews,
} from "@/components/icons";
import { getTranslations } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import {
  parseSelection,
  resolveRange,
  spendFor,
  spendPerBucket,
  defaultGranularity,
} from "@/lib/period";
import {
  bucket,
  compare,
  deltaPercent,
  getDailySeries,
  getTopSkus,
} from "@/lib/ozon/analytics";
import { getProducts, getSellerRating } from "@/lib/ozon/catalog";
import { getAdSpend } from "@/lib/ozon/marketing";
import { getChats } from "@/lib/ozon/support";
import { OZON_LIVE } from "@/lib/ozon/client";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const selection = parseSelection(await searchParams);

  const [series, ads, products, chats, rating] = await Promise.all([
    getDailySeries(),
    getAdSpend(),
    getProducts(),
    getChats(),
    getSellerRating(),
  ]);

  // Der Zeitraum steht erst fest, wenn die Reihe da ist — „alle Zeit“ richtet
  // sich nach ihrem ersten Tag, und die SKU-Abfrage braucht beide Grenzen.
  const range = resolveRange(selection, series);
  const topSkus = await getTopSkus(range.from, range.to);

  const { current, previous, currentTotal, previousTotal } = compare(
    series,
    range,
  );

  const granularity = defaultGranularity(range.days);
  const rows = bucket(current, granularity);

  const spend = spendFor(ads.byDay, current);
  const previousSpend = spendFor(ads.byDay, previous);
  const spendValues = spendPerBucket(rows, ads.byDay, range.to);

  const drr = currentTotal.revenue > 0 ? (spend / currentTotal.revenue) * 100 : 0;
  const previousDrr =
    previousTotal.revenue > 0 ? (previousSpend / previousTotal.revenue) * 100 : 0;
  const roas = spend > 0 ? currentTotal.revenue / spend : 0;
  const avgOrder =
    currentTotal.orderedUnits > 0
      ? currentTotal.revenue / currentTotal.orderedUnits
      : 0;
  const previousAvgOrder =
    previousTotal.orderedUnits > 0
      ? previousTotal.revenue / previousTotal.orderedUnits
      : 0;

  const outOfStock = products.filter(
    (p) => !p.isArchived && p.fboStock + p.fbsStock === 0,
  );
  const redZone = products.filter((p) => p.priceZone === "red");
  const unreadBuyerChats = chats.filter(
    (c) => c.kind === "buyer" && c.unreadCount > 0,
  );

  const chartSeries = [
    {
      id: "revenue",
      label: t.kpi.revenue,
      color: "var(--s-umsatz)",
      values: rows.map((row) => row.revenue),
      filled: true,
    },
    {
      id: "spend",
      label: t.kpi.adSpend,
      color: "var(--s-spend)",
      values: spendValues,
      axis: "right" as const,
    },
  ];

  const topRevenue = Math.max(...topSkus.map((s) => s.revenue), 1);

  const alerts = [
    outOfStock.length > 0 && `${outOfStock.length} ${t.home.alertOutOfStock}`,
    redZone.length > 0 && `${redZone.length} ${t.home.alertRedZone}`,
    unreadBuyerChats.length > 0 &&
      `${unreadBuyerChats.length} ${t.home.alertUnread}`,
  ].filter((value): value is string => Boolean(value));

  const vs = t.common.vsPrevious;

  return (
    <>
      <PageHeader
        title={t.home.title}
        description={t.home.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <span className="chip" data-tone={OZON_LIVE ? "ok" : undefined}>
              {OZON_LIVE ? t.common.liveBadge : t.common.demoBadge}
            </span>
            <RangePicker
              path="/"
              selection={selection}
              range={range}
              t={t}
              formatDate={f.dayMonthYear}
            />
          </div>
        }
      />

      {!OZON_LIVE && (
        <p className="panel mb-5 px-4 py-3 text-sm text-dim">
          <span className="font-medium text-txt">{t.common.noKeys}.</span>{" "}
          {t.common.noKeysHint}
        </p>
      )}

      <KpiGrid>
        <Kpi
          icon={<IconRevenue />}
          label={t.kpi.revenue}
          value={f.money(currentTotal.revenue)}
          footer={
            <Delta
              points={deltaPercent(currentTotal.revenue, previousTotal.revenue)}
              format={f.delta}
              title={vs}
            />
          }
        />
        <Kpi
          icon={<IconUnits />}
          label={t.kpi.units}
          value={f.integer(currentTotal.orderedUnits)}
          footer={
            <Delta
              points={deltaPercent(
                currentTotal.orderedUnits,
                previousTotal.orderedUnits,
              )}
              format={f.delta}
              title={vs}
            />
          }
        />
        <Kpi
          icon={<IconAd />}
          label={t.kpi.adSpend}
          value={f.money(spend)}
          footer={
            <Delta
              points={deltaPercent(spend, previousSpend)}
              good="neutral"
              format={f.delta}
              title={vs}
            />
          }
        />
        <Kpi
          icon={<IconPercent />}
          label={t.kpi.drr}
          hint={t.kpi.drrHint}
          value={f.percent(drr)}
          footer={
            <Delta
              points={deltaPercent(drr, previousDrr)}
              good="down"
              format={f.delta}
              title={vs}
            />
          }
        />
      </KpiGrid>

      <MoreMetrics showMore={t.common.showMore} showLess={t.common.showLess}>
        <KpiGrid>
          <Kpi
            icon={<IconRevenue />}
            label={t.kpi.avgOrder}
            value={f.money(avgOrder)}
            footer={
              <Delta
                points={deltaPercent(avgOrder, previousAvgOrder)}
                format={f.delta}
                title={vs}
              />
            }
          />
          <Kpi
            icon={<IconAd />}
            label={t.kpi.roas}
            hint={t.kpi.roasHint}
            value={f.ratio(roas)}
          />
          <Kpi
            icon={<IconViews />}
            label={t.kpi.views}
            value={f.compact(currentTotal.views)}
            footer={
              <Delta
                points={deltaPercent(currentTotal.views, previousTotal.views)}
                format={f.delta}
                title={vs}
              />
            }
          />
          <Kpi
            icon={<IconSearch />}
            label={t.kpi.searchViews}
            value={f.compact(currentTotal.searchViews)}
            footer={
              <Delta
                points={deltaPercent(
                  currentTotal.searchViews,
                  previousTotal.searchViews,
                )}
                format={f.delta}
                title={vs}
              />
            }
          />
          <Kpi
            icon={<IconCart />}
            label={t.kpi.toCart}
            value={f.integer(currentTotal.toCart)}
            footer={
              <Delta
                points={deltaPercent(currentTotal.toCart, previousTotal.toCart)}
                format={f.delta}
                title={vs}
              />
            }
          />
          <Kpi
            icon={<IconPercent />}
            label={t.kpi.convToCart}
            value={f.percent(currentTotal.convToCart)}
            footer={
              <Delta
                points={deltaPercent(
                  currentTotal.convToCart,
                  previousTotal.convToCart,
                )}
                format={f.delta}
                title={vs}
              />
            }
          />
          <Kpi
            icon={<IconCancel />}
            label={t.kpi.cancellations}
            value={f.integer(currentTotal.cancellations)}
            footer={
              <Delta
                points={deltaPercent(
                  currentTotal.cancellations,
                  previousTotal.cancellations,
                )}
                good="down"
                format={f.delta}
                title={vs}
              />
            }
          />
          <Kpi
            icon={<IconReturn />}
            label={t.kpi.returns}
            value={f.integer(currentTotal.returns)}
            footer={
              <Delta
                points={deltaPercent(currentTotal.returns, previousTotal.returns)}
                good="down"
                format={f.delta}
                title={vs}
              />
            }
          />
        </KpiGrid>
      </MoreMetrics>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel title={t.home.chartTitle} aside={<Legend series={chartSeries} />}>
          <LineChart
            labels={rows.map((row) => row.date)}
            series={chartSeries}
            formatLeft={f.moneyCompact}
            formatRight={f.moneyCompact}
            formatLabel={granularity === "month" ? f.monthYear : f.dayMonth}
            empty={t.common.noData}
          />
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={t.home.attention}>
            {alerts.length === 0 ? (
              <p className="text-sm text-dim">{t.home.allGood}</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert) => (
                  <li key={alert} className="flex items-start gap-2 text-sm">
                    <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t.kpi.rating}>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-dim">
                  <IconStar />
                  {t.kpi.rating}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {f.decimal(rating.productScore)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-dim">
                  <IconGlobe />
                  {t.kpi.localization}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {f.percent(rating.localizationPercent)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-dim">
                  <IconStock />
                  {t.kpi.outOfStock}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {f.integer(outOfStock.length)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-dim">
                  <IconChat />
                  {t.kpi.unreadChats}
                </dt>
                <dd className="font-semibold tabular-nums">
                  {f.integer(unreadBuyerChats.length)}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel
        title={t.home.topProducts}
        className="mt-4"
        aside={
          <Link href="/products" className="text-xs">
            {t.common.open}
          </Link>
        }
      >
        <BarList
          items={topSkus.slice(0, 8).map((sku) => ({
            id: sku.sku,
            label: sku.name,
            value: f.money(sku.revenue),
            share: sku.revenue / topRevenue,
          }))}
        />
      </Panel>
    </>
  );
}
