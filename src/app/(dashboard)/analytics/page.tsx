import { PageHeader, Panel } from "@/components/page-header";
import { SegLinks } from "@/components/seg-links";
import { Funnel, Legend, LineChart } from "@/components/charts";
import { Delta, Kpi, KpiGrid, MoreMetrics } from "@/components/kpi";
import {
  IconCancel,
  IconCart,
  IconRevenue,
  IconSearch,
  IconReturn,
  IconUnits,
  IconViews,
} from "@/components/icons";
import { getTranslations } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import { RangePicker } from "@/components/range-picker";
import {
  GRANULARITIES,
  defaultGranularity,
  parseGranularity,
  parseSelection,
  resolveRange,
  selectionParams,
  withParams,
  type Granularity,
} from "@/lib/period";
import {
  bucket,
  compare,
  deltaPercent,
  getDailySeries,
  getTopSkus,
} from "@/lib/ozon/analytics";

export default async function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const params = await searchParams;
  const selection = parseSelection(params);

  const series = await getDailySeries();
  const range = resolveRange(selection, series);
  const topSkus = await getTopSkus(range.from, range.to);

  const granularity = parseGranularity(params.g, defaultGranularity(range.days));
  const { current, currentTotal, previousTotal } = compare(series, range);
  const rows = bucket(current, granularity);

  const searchShare =
    currentTotal.views > 0
      ? (currentTotal.searchViews / currentTotal.views) * 100
      : 0;
  const previousSearchShare =
    previousTotal.views > 0
      ? (previousTotal.searchViews / previousTotal.views) * 100
      : 0;
  const cartToOrder =
    currentTotal.toCart > 0
      ? (currentTotal.orderedUnits / currentTotal.toCart) * 100
      : 0;

  const traffic = [
    {
      id: "views",
      label: t.kpi.views,
      color: "var(--s-umsatz)",
      values: rows.map((row) => row.views),
      filled: true,
    },
    {
      id: "searchViews",
      label: t.kpi.searchViews,
      color: "var(--s-roas)",
      values: rows.map((row) => row.searchViews),
    },
  ];

  const orders = [
    {
      id: "units",
      label: t.kpi.units,
      color: "var(--s-umsatz)",
      values: rows.map((row) => row.orderedUnits),
      filled: true,
    },
    {
      id: "conv",
      label: t.kpi.convToCart,
      color: "var(--s-roas)",
      values: rows.map((row) => row.convToCart),
      axis: "right" as const,
    },
  ];

  const funnelSteps = [
    {
      label: t.analytics.funnelViews,
      value: f.compact(currentTotal.views),
      share: 1,
      conversion: null,
    },
    {
      label: t.analytics.funnelToCart,
      value: f.integer(currentTotal.toCart),
      share:
        currentTotal.views > 0 ? currentTotal.toCart / currentTotal.views : 0,
      conversion: f.percent(currentTotal.convToCart),
    },
    {
      label: t.analytics.funnelOrders,
      value: f.integer(currentTotal.orderedUnits),
      share:
        currentTotal.views > 0
          ? currentTotal.orderedUnits / currentTotal.views
          : 0,
      conversion: f.percent(cartToOrder),
    },
  ];

  const vs = t.common.vsPrevious;
  const granularityLabel: Record<Granularity, string> = {
    day: t.analytics.byDay,
    week: t.analytics.byWeek,
    month: t.analytics.byMonth,
  };

  return (
    <>
      <PageHeader
        title={t.analytics.title}
        description={t.analytics.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <RangePicker
              path="/analytics"
              selection={selection}
              range={range}
              keep={{ g: granularity }}
              t={t}
              f={f}
            />
            <SegLinks
              options={GRANULARITIES.map((candidate) => ({
                href: withParams("/analytics", {
                  ...selectionParams(selection),
                  g: candidate,
                }),
                label: granularityLabel[candidate],
                active: granularity === candidate,
              }))}
            />
          </div>
        }
      />

      <KpiGrid>
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
          icon={<IconCart />}
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
          icon={<IconSearch />}
          label={t.kpi.searchViews}
          value={f.percent(searchShare)}
          sub={f.compact(currentTotal.searchViews)}
          footer={
            <Delta
              points={deltaPercent(searchShare, previousSearchShare)}
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
            label={t.kpi.revenue}
            value={f.money(currentTotal.revenue)}
            footer={
              <Delta
                points={deltaPercent(
                  currentTotal.revenue,
                  previousTotal.revenue,
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
          title={t.analytics.trafficChart}
          aside={<Legend series={traffic} />}
        >
          <LineChart
            labels={rows.map((row) => row.date)}
            series={traffic}
            formatLeft={f.compact}
            formatLabel={granularity === "month" ? f.monthYear : f.dayMonth}
            empty={t.common.noData}
          />
        </Panel>

        <Panel title={t.analytics.funnel}>
          <Funnel steps={funnelSteps} stepLabel={t.analytics.funnelStep} />
        </Panel>
      </div>

      <Panel
        title={t.analytics.ordersChart}
        className="mt-4"
        aside={<Legend series={orders} />}
      >
        <LineChart
          labels={rows.map((row) => row.date)}
          series={orders}
          formatLeft={f.integer}
          formatRight={f.percent}
          formatLabel={granularity === "month" ? f.monthYear : f.dayMonth}
          empty={t.common.noData}
        />
      </Panel>

      <Panel title={t.home.topProducts} className="mt-4">
        <div className="scroll-x -mx-4 px-4">
          <table className="table text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-3">{t.products.colProduct}</th>
                <th className="py-2 pr-3 text-right">{t.kpi.views}</th>
                <th className="py-2 pr-3 text-right">{t.kpi.toCart}</th>
                <th className="py-2 pr-3 text-right">{t.kpi.convToCart}</th>
                <th className="py-2 pr-3 text-right">{t.kpi.units}</th>
                <th className="py-2 text-right">{t.kpi.revenue}</th>
              </tr>
            </thead>
            <tbody>
              {topSkus.slice(0, 15).map((sku) => (
                <tr key={sku.sku}>
                  <td className="max-w-[22rem] truncate py-2 pr-3" title={sku.name}>
                    {sku.name}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {f.compact(sku.views)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {f.integer(sku.toCart)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {f.percent(sku.convToCart)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {f.integer(sku.orderedUnits)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {f.money(sku.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
