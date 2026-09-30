import Link from "next/link";
import { IconChevron, IconTrend } from "@/components/icons";

/** Bei Rückgaben und Storno ist "mehr" schlecht — die Richtung muss also
 *  pro Kennzahl angegeben werden und darf nicht am Vorzeichen hängen. */
export type GoodDirection = "up" | "down" | "neutral";

export function Delta({
  points,
  good = "up",
  format,
  title,
}: {
  points: number | null;
  good?: GoodDirection;
  format: (points: number) => string;
  title: string;
}) {
  if (points === null) return null;

  const rounded = Math.abs(points) < 0.05 ? 0 : points;
  const tone =
    rounded === 0 || good === "neutral"
      ? "text-dim"
      : (rounded > 0) === (good === "up")
        ? "text-ok"
        : "text-bad";

  return (
    <span className={`inline-flex items-center gap-1 text-xs ${tone}`} title={title}>
      {rounded !== 0 && (
        <IconTrend direction={rounded > 0 ? "up" : "down"} className="h-2.5 w-2.5" />
      )}
      <span className="tabular-nums">{format(rounded)}</span>
    </span>
  );
}

export function Kpi({
  icon,
  label,
  value,
  sub,
  hint,
  footer,
  chart,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  footer?: React.ReactNode;
  /** Der Verlauf unter der Zahl — eine Zahl ohne Form sagt nur die Hälfte. */
  chart?: React.ReactNode;
  /** Wohin die Kachel führt, wenn sich hinter ihr mehr verbirgt. */
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 text-dim">
        {icon}
        <span className="text-xs font-medium" title={hint}>
          {label}
        </span>
        {href && <IconChevron className="ml-auto h-3 w-3 shrink-0 -rotate-90" />}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums">
        {value}
        {sub && (
          <span className="ml-1.5 text-sm font-normal text-dim">{sub}</span>
        )}
      </p>
      {footer && <div className="mt-1.5">{footer}</div>}
      {chart && <div className="mt-2 -mb-1">{chart}</div>}
    </>
  );

  if (!href) return <div className="tile p-4">{body}</div>;

  return (
    <Link href={href} className="tile block p-4 no-underline">
      {body}
    </Link>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
  );
}

/** "Ausklappen" ohne Client-Javascript: <details> trägt den Zustand selbst,
 *  die Kennzahlen dahinter werden trotzdem serverseitig gerendert. */
export function MoreMetrics({
  showMore,
  showLess,
  children,
}: {
  showMore: string;
  showLess: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group mt-3">
      <summary className="btn btn-quiet inline-flex cursor-pointer list-none gap-1.5 px-3 py-1.5 text-sm [&::-webkit-details-marker]:hidden">
        <span className="group-open:hidden">{showMore}</span>
        <span className="hidden group-open:inline">{showLess}</span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          className="h-3 w-3 transition-transform duration-200 group-open:-rotate-180"
        >
          <path d="M3 4.5L6 8l3-3.5" />
        </svg>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
