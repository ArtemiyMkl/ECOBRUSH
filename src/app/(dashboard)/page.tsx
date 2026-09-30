import Link from "next/link";
import { PageHeader, Panel } from "@/components/page-header";
import { RangePicker } from "@/components/range-picker";
import { BarList, Legend, LineChart, Sparkline } from "@/components/charts";
import { Delta, Kpi, KpiGrid, MoreMetrics } from "@/components/kpi";
import {
  IconAd,
  IconAlert,
  IconCancel,
  IconCart,
  IconChat,
  IconChevron,
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
  selectionParams,
  spendFor,
  spendPerBucket,
  defaultGranularity,
  withParams,
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
import { getPostings, hourlyTotals, ordersWindow } from "@/lib/ozon/orders";
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

  // Ein einzelner Tag ist als Punkt keine Entwicklung. Stunden stehen nur in den
  // Aufträgen, und die reichen vierzehn Tage zurück — für ältere Tage bleibt es
  // bei der Tagesreihe.
  const ordersRange = ordersWindow();
  const hourly =
    range.days === 1 && range.from >= ordersRange.since.slice(0, 10)
      ? hourlyTotals(
          await getPostings(ordersRange.since, ordersRange.to),
          range.from,
        )
      : null;

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

  // Im Stundenmodus gibt es keine Werbeausgaben je Stunde — dort läuft die
  // zweite Linie über die Stückzahl, die aus denselben Aufträgen kommt.
  const revenueTrend = hourly
    ? hourly.map((hour) => hour.revenue)
    : rows.map((row) => row.revenue);
  const unitsTrend = hourly
    ? hourly.map((hour) => hour.units)
    : rows.map((row) => row.orderedUnits);
  const drrTrend = rows.map((row, index) =>
    row.revenue > 0 ? (spendValues[index] / row.revenue) * 100 : 0,
  );

  const chartSeries = [
    {
      id: "revenue",
      label: t.kpi.revenue,
      color: "var(--s-umsatz)",
      values: revenueTrend,
      filled: true,
    },
    hourly
      ? {
          id: "units",
          label: t.kpi.units,
          color: "var(--s-roas)",
          values: unitsTrend,
          axis: "right" as const,
        }
      : {
          id: "spend",
          label: t.kpi.adSpend,
          color: "var(--s-spend)",
          values: spendValues,
          axis: "right" as const,
        },
  ];

  const topRevenue = Math.max(...topSkus.map((s) => s.revenue), 1);

  // Jede Warnung führt auf die Liste, die sie meint — eine Zahl ohne Weg dahin
  // ist keine Information, nur ein Schreck.
  const alerts = [
    outOfStock.length > 0 && {
      href: withParams("/products", { s: "out" }),
      label: `${outOfStock.length} ${t.home.alertOutOfStock}`,
    },
    redZone.length > 0 && {
      href: withParams("/products", { z: "red" }),
      label: `${redZone.length} ${t.home.alertRedZone}`,
    },
    unreadBuyerChats.length > 0 && {
      href: "/customers",
      label: `${unreadBuyerChats.length} ${t.home.alertUnread}`,
    },
  ].filter((alert): alert is { href: string; label: string } => Boolean(alert));

  const period = selectionParams(selection);
  const analyticsHref = withParams("/analytics", period);
  const promotionHref = withParams("/promotion", period);

  const stats = [
    {
      id: "rating",
      icon: <IconStar />,
      label: t.kpi.rating,
      value: f.decimal(rating.productScore),
      href: null,
    },
    {
      id: "localization",
      icon: <IconGlobe />,
      label: t.kpi.localization,
      value: f.percent(rating.localizationPercent),
      href: null,
    },
    {
      id: "stock",
      icon: <IconStock />,
      label: t.kpi.outOfStock,
      value: f.integer(outOfStock.length),
      href: withParams("/products", { s: "out" }),
    },
    {
      id: "chats",
      icon: <IconChat />,
      label: t.kpi.unreadChats,
      value: f.integer(unreadBuyerChats.length),
      href: "/customers",
    },
  ];

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
              f={f}
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
          href={analyticsHref}
          footer={
            <Delta
              points={deltaPercent(currentTotal.revenue, previousTotal.revenue)}
              format={f.delta}
              title={vs}
            />
          }
          chart={
            <Sparkline
              id="revenue"
              values={revenueTrend}
              color="var(--s-umsatz)"
            />
          }
        />
        <Kpi
          icon={<IconUnits />}
          label={t.kpi.units}
          value={f.integer(currentTotal.orderedUnits)}
          href={analyticsHref}
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
          chart={
            <Sparkline id="units" values={unitsTrend} color="var(--s-roas)" />
          }
        />
        <Kpi
          icon={<IconAd />}
          label={t.kpi.adSpend}
          value={f.money(spend)}
          href={promotionHref}
          footer={
            <Delta
              points={deltaPercent(spend, previousSpend)}
              good="neutral"
              format={f.delta}
              title={vs}
            />
          }
          chart={
            <Sparkline id="spend" values={spendValues} color="var(--s-spend)" />
          }
        />
        <Kpi
          icon={<IconPercent />}
          label={t.kpi.drr}
          hint={t.kpi.drrHint}
          value={f.percent(drr)}
          href={promotionHref}
          footer={
            <Delta
              points={deltaPercent(drr, previousDrr)}
              good="down"
              format={f.delta}
              title={vs}
            />
          }
          chart={
            <Sparkline id="drr" values={drrTrend} color="var(--s-spend)" />
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
        <Panel
          title={hourly ? t.home.chartTitleHours : t.home.chartTitle}
          aside={<Legend series={chartSeries} />}
        >
          <LineChart
            labels={hourly ? hourly.map((hour) => hour.hour) : rows.map((row) => row.date)}
            series={chartSeries}
            formatLeft={f.moneyCompact}
            formatRight={hourly ? f.compact : f.moneyCompact}
            formatLabel={
              hourly
                ? (label) => label
                : granularity === "month"
                  ? f.monthYear
                  : f.dayMonth
            }
            empty={t.common.noData}
          />
          {hourly && (
            <p className="mt-2 text-xs text-dim">{t.home.chartHoursNote}</p>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title={t.home.attention}>
            {alerts.length === 0 ? (
              <p className="text-sm text-dim">{t.home.allGood}</p>
            ) : (
              <ul className="-mx-1 space-y-0.5">
                {alerts.map((alert) => (
                  <li key={alert.href}>
                    <Link
                      href={alert.href}
                      className="nav-link flex items-start gap-2 px-2 py-1.5 text-sm no-underline"
                    >
                      <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                      <span className="text-txt">{alert.label}</span>
                      <IconChevron className="mt-0.5 ml-auto h-3 w-3 shrink-0 -rotate-90" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={t.kpi.rating}>
            <ul className="-mx-1 space-y-0.5 text-sm">
              {stats.map((stat) => {
                const body = (
                  <>
                    <span className="flex items-center gap-1.5 text-dim">
                      {stat.icon}
                      {stat.label}
                    </span>
                    <span className="ml-auto font-semibold tabular-nums text-txt">
                      {stat.value}
                    </span>
                    {stat.href && (
                      <IconChevron className="h-3 w-3 shrink-0 -rotate-90 text-dim" />
                    )}
                  </>
                );

                return (
                  <li key={stat.id}>
                    {stat.href ? (
                      <Link
                        href={stat.href}
                        className="nav-link flex items-center gap-2 px-2 py-1.5 no-underline"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-2 px-2 py-1.5">
                        {body}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel
        title={t.home.topProducts}
        className="mt-4"
        aside={
          <Link href={withParams("/products", period)} className="text-xs">
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
            href: withParams(`/products/${sku.sku}`, period),
          }))}
        />
      </Panel>
    </>
  );
}
