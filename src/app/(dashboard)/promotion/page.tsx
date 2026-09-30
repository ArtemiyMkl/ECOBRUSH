import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { SegLinks } from "@/components/seg-links";
import { Legend, LineChart } from "@/components/charts";
import { Delta, Kpi, KpiGrid } from "@/components/kpi";
import {
  IconAd,
  IconPercent,
  IconRevenue,
  IconTag,
} from "@/components/icons";
import { getTranslations, type Dictionary } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import { RangePicker } from "@/components/range-picker";
import {
  defaultGranularity,
  parseSelection,
  resolveRange,
  selectionParams,
  spendFor,
  spendPerBucket,
  withParams,
} from "@/lib/period";
import {
  bucket,
  compare,
  deltaPercent,
  getDailySeries,
} from "@/lib/ozon/analytics";
import { campaignSpend, getAdSpend, getCampaigns } from "@/lib/ozon/marketing";
import type { CampaignState } from "@/lib/ozon/types";

const STATE_FILTERS = ["running", "inactive", "finished", "archived"] as const;

const STATE_TONES: Record<CampaignState, string | undefined> = {
  running: "ok",
  inactive: "warn",
  finished: undefined,
  archived: undefined,
};

function stateLabel(state: CampaignState, t: Dictionary): string {
  return {
    running: t.promotion.running,
    inactive: t.promotion.inactive,
    finished: t.promotion.finished,
    archived: t.promotion.archived,
  }[state];
}

function parseState(
  value: string | string[] | undefined,
): CampaignState | null {
  return STATE_FILTERS.find((state) => state === value) ?? null;
}

export default async function PromotionPage({
  searchParams,
}: PageProps<"/promotion">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const params = await searchParams;
  const selection = parseSelection(params);
  const state = parseState(params.s) ?? "running";

  const [series, ads, campaigns] = await Promise.all([
    getDailySeries(),
    getAdSpend(),
    getCampaigns(),
  ]);

  const range = resolveRange(selection, series);
  const { current, previous, currentTotal } = compare(series, range);
  const spend = spendFor(ads.byDay, current);
  const previousSpend = spendFor(ads.byDay, previous);
  const drr = currentTotal.revenue > 0 ? (spend / currentTotal.revenue) * 100 : 0;
  const roas = spend > 0 ? currentTotal.revenue / spend : 0;

  const spendByCampaign = new Map(
    campaignSpend(ads, range.from, range.to).map((entry) => [
      entry.campaignId,
      entry.spend,
    ]),
  );
  const listed = campaigns
    .filter((campaign) => campaign.state === state)
    .sort(
      (a, b) =>
        (spendByCampaign.get(b.id) ?? 0) - (spendByCampaign.get(a.id) ?? 0),
    );

  const granularity = defaultGranularity(range.days);
  const rows = bucket(current, granularity);
  const spendSeries = [
    {
      id: "spend",
      label: t.kpi.adSpend,
      color: "var(--s-spend)",
      values: spendPerBucket(rows, ads.byDay, range.to),
      filled: true,
    },
    {
      id: "revenue",
      label: t.kpi.revenue,
      color: "var(--s-umsatz)",
      values: rows.map((row) => row.revenue),
      axis: "right" as const,
    },
  ];

  const stateParam = state === "running" ? undefined : state;
  const vs = t.common.vsPrevious;

  return (
    <>
      <PageHeader
        title={t.promotion.title}
        description={t.promotion.subtitle}
        actions={
          <RangePicker
            path="/promotion"
            selection={selection}
            range={range}
            keep={{ s: stateParam }}
            t={t}
            formatDate={f.dayMonthYear}
          />
        }
      />

      <KpiGrid>
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
        />
        <Kpi
          icon={<IconRevenue />}
          label={t.kpi.roas}
          hint={t.kpi.roasHint}
          value={f.ratio(roas)}
        />
        <Kpi
          icon={<IconTag />}
          label={t.kpi.activeCampaigns}
          value={f.integer(
            campaigns.filter((campaign) => campaign.state === "running").length,
          )}
          sub={`${t.common.of} ${f.integer(campaigns.length)}`}
        />
      </KpiGrid>

      <Panel
        title={t.promotion.spendChart}
        className="mt-5"
        aside={<Legend series={spendSeries} />}
      >
        <LineChart
          labels={rows.map((row) => row.date)}
          series={spendSeries}
          formatLeft={f.moneyCompact}
          formatRight={f.moneyCompact}
          formatLabel={granularity === "month" ? f.monthYear : f.dayMonth}
          empty={t.common.noData}
        />
      </Panel>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegLinks
          options={STATE_FILTERS.map((candidate) => ({
            href: withParams("/promotion", {
              ...selectionParams(selection),
              s: candidate === "running" ? undefined : candidate,
            }),
            label: stateLabel(candidate, t),
            active: state === candidate,
          }))}
        />
        <span className="text-xs text-dim">
          {f.integer(listed.length)} {t.common.of} {f.integer(campaigns.length)}
        </span>
      </div>

      <Panel title={t.promotion.campaigns} className="mt-4">
        {listed.length === 0 ? (
          <EmptyState>{t.common.noData}</EmptyState>
        ) : (
          <div className="scroll-x -mx-4 px-4">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-3">{t.promotion.colCampaign}</th>
                  <th className="py-2 pr-3">{t.promotion.colState}</th>
                  <th className="py-2 pr-3 text-right">
                    {t.promotion.colSpend}
                  </th>
                  <th className="py-2 text-right">{t.promotion.colShare}</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((campaign) => {
                  const campaignTotal = spendByCampaign.get(campaign.id) ?? 0;
                  return (
                    <tr key={campaign.id}>
                      <td className="py-2 pr-3">
                        <span className="block max-w-[28rem] truncate">
                          {campaign.title || t.promotion.unnamed}
                        </span>
                        <span className="block text-xs text-dim">
                          {campaign.id}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="chip" data-tone={STATE_TONES[campaign.state]}>
                          {stateLabel(campaign.state, t)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {campaignTotal > 0
                          ? f.money(campaignTotal)
                          : t.promotion.noSpend}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {spend > 0 && campaignTotal > 0
                          ? f.percent((campaignTotal / spend) * 100)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
