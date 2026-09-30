import { EmptyState, PageHeader, Panel } from "@/components/page-header";
import { SegLinks } from "@/components/seg-links";
import { Kpi, KpiGrid } from "@/components/kpi";
import {
  IconCart,
  IconClock,
  IconRefresh,
  IconRevenue,
  IconTruck,
} from "@/components/icons";
import { getTranslations, type Dictionary } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import { withParams } from "@/lib/period";
import { refreshOrders } from "@/lib/ozon/actions";
import { getPostings, moscowDay, ordersWindow } from "@/lib/ozon/orders";
import type { Posting, PostingGroup } from "@/lib/ozon/types";

const GROUP_ORDER: PostingGroup[] = ["new", "shipping", "done", "cancelled"];

const GROUP_TONE: Record<PostingGroup, string | undefined> = {
  new: "acc",
  shipping: "warn",
  done: "ok",
  cancelled: "bad",
};

function groupLabel(group: PostingGroup, t: Dictionary): string {
  return {
    new: t.orders.groupNew,
    shipping: t.orders.groupShipping,
    done: t.orders.groupDone,
    cancelled: t.orders.groupCancelled,
  }[group];
}

/** Ozon erfindet gelegentlich neue Status; dann steht der Rohwert da, statt
 *  dass die Zeile leer bleibt. */
function statusLabel(status: string, t: Dictionary): string {
  const labels: Record<string, string> = t.orders.status;
  return labels[status] ?? status;
}

function parseGroup(value: string | string[] | undefined): PostingGroup | null {
  return GROUP_ORDER.find((group) => group === value) ?? null;
}

/** Früheste offene FBS-Frist — die einzige Zahl auf der Seite, die eine
 *  Handlung auslöst. */
function nextShipment(postings: Posting[]): string | null {
  const open = postings
    .filter((posting) => posting.group === "new" || posting.group === "shipping")
    .map((posting) => posting.shipmentDate)
    .filter((date): date is string => date !== null)
    .sort();
  return open[0] ?? null;
}

export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const params = await searchParams;
  const group = parseGroup(params.g);

  const { since, to } = ordersWindow();
  const postings = await getPostings(since, to);

  const today = moscowDay(new Date());
  const placedToday = postings.filter(
    (posting) => moscowDay(posting.placedAt) === today,
  );
  const revenueToday = placedToday
    .filter((posting) => posting.group !== "cancelled")
    .reduce((sum, posting) => sum + posting.total, 0);
  const awaiting = postings.filter((posting) => posting.group === "new");
  const handover = nextShipment(postings);

  const visible = group
    ? postings.filter((posting) => posting.group === group)
    : postings;

  return (
    <>
      <PageHeader
        title={t.orders.title}
        description={t.orders.subtitle}
        actions={
          <form action={refreshOrders}>
            <button
              type="submit"
              className="btn btn-quiet inline-flex items-center gap-1.5 px-3 py-1.5 text-sm"
            >
              <IconRefresh className="h-3.5 w-3.5" />
              {t.orders.refresh}
            </button>
          </form>
        }
      />

      <KpiGrid>
        <Kpi
          icon={<IconCart />}
          label={t.orders.today}
          value={f.integer(placedToday.length)}
        />
        <Kpi
          icon={<IconRevenue />}
          label={t.orders.todaySum}
          value={f.money(revenueToday)}
        />
        <Kpi
          icon={<IconClock />}
          label={t.orders.awaiting}
          value={f.integer(awaiting.length)}
        />
        <Kpi
          icon={<IconTruck />}
          label={t.orders.nextShipment}
          value={handover ? f.dateTime(handover) : "—"}
        />
      </KpiGrid>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <SegLinks
          options={[
            {
              href: "/orders",
              label: t.common.all,
              active: group === null,
            },
            ...GROUP_ORDER.map((candidate) => ({
              href: withParams("/orders", { g: candidate }),
              label: groupLabel(candidate, t),
              active: group === candidate,
            })),
          ]}
        />
        <span className="text-xs text-dim">
          {f.integer(visible.length)} {t.common.of} {f.integer(postings.length)}
        </span>
      </div>

      <Panel
        title={t.orders.title}
        className="mt-4"
        aside={
          postings[0] && (
            <span className="text-xs text-dim">
              {t.orders.lastOrder}: {f.dateTime(postings[0].placedAt)}
            </span>
          )
        }
      >
        {visible.length === 0 ? (
          <EmptyState>{t.common.noData}</EmptyState>
        ) : (
          <div className="scroll-x -mx-4 px-4">
            <table className="table text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-3">{t.orders.colPlaced}</th>
                  <th className="py-2 pr-3">{t.orders.colPosting}</th>
                  <th className="py-2 pr-3">{t.orders.colProduct}</th>
                  <th className="py-2 pr-3">{t.orders.colDestination}</th>
                  <th className="py-2 pr-3">{t.orders.colScheme}</th>
                  <th className="py-2 pr-3">{t.orders.colStatus}</th>
                  <th className="py-2 text-right">{t.orders.colTotal}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((posting) => {
                  const [first, ...rest] = posting.items;

                  return (
                    <tr key={posting.postingNumber}>
                      <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                        {f.dateTime(posting.placedAt)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="block whitespace-nowrap tabular-nums">
                          {posting.postingNumber}
                        </span>
                        {posting.shipmentDate &&
                          posting.group !== "done" &&
                          posting.group !== "cancelled" && (
                            <span className="block text-xs text-dim">
                              {t.orders.shipBy}:{" "}
                              {f.dateTime(posting.shipmentDate)}
                            </span>
                          )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="block max-w-[22rem] truncate">
                          {first.name}
                        </span>
                        <span className="block text-xs text-dim">
                          {first.offerId} · {f.integer(posting.units)}{" "}
                          {t.orders.units}
                          {rest.length > 0 &&
                            ` · +${f.integer(rest.length)} ${t.orders.more}`}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className="block">{posting.city || "—"}</span>
                        <span className="block text-xs text-dim">
                          {posting.warehouse}
                          {posting.isLegal && ` · ${t.orders.legal}`}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-dim uppercase">
                        {posting.scheme}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="chip" data-tone={GROUP_TONE[posting.group]}>
                          {statusLabel(posting.status, t)}
                        </span>
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {f.money(posting.total)}
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
