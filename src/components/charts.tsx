export type Series = {
  id: string;
  label: string;
  /** CSS-Farbe, in der Praxis immer ein Serien-Token: var(--s-umsatz). */
  color: string;
  values: number[];
  /** Zwei Achsen, weil Werbeausgaben rund ein Zehntel des Umsatzes sind und
   *  auf gemeinsamer Skala als flache Linie verschwinden. */
  axis?: "left" | "right";
  /** Die Leitserie bekommt eine Füllung, alle weiteren bleiben Linien. */
  filled?: boolean;
};

const W = 800;
const PAD_Y = { top: 14, bottom: 26 };
const TICK_FONT = 10;

/** Die Achsenbreite richtet sich nach der längsten Beschriftung: Russisch
 *  kürzt auf „12,5 тыс. ₽“, Deutsch schreibt „12.500 RUB“ aus. Bei festem Rand
 *  läuft die längere Variante aus der viewBox und wird stumm beschnitten. */
function axisWidth(labels: string[]): number {
  const longest = Math.max(0, ...labels.map((label) => label.length));
  return 8 + Math.ceil(longest * TICK_FONT * 0.62);
}

/** Rundet die Achsenspitze auf einen lesbaren Wert auf, damit die
 *  Gitterlinien nicht auf 137 481 sitzen. */
function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
  for (const step of steps) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

export function LineChart({
  labels,
  series,
  height = 240,
  formatLeft,
  formatRight,
  formatLabel,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  formatLeft: (value: number) => string;
  formatRight?: (value: number) => string;
  formatLabel: (label: string) => string;
}) {
  const count = labels.length;
  if (count === 0) return null;

  const maxOf = (axis: "left" | "right") =>
    niceMax(
      Math.max(
        0,
        ...series
          .filter((s) => (s.axis ?? "left") === axis)
          .flatMap((s) => s.values),
      ),
    );

  const max = { left: maxOf("left"), right: maxOf("right") };

  const ticks = [0, 0.5, 1];
  const leftTicks = ticks.map((t) => formatLeft(max.left * t));
  const rightTicks = formatRight
    ? ticks.map((t) => formatRight(max.right * t))
    : [];

  const PAD = {
    ...PAD_Y,
    left: axisWidth(leftTicks),
    right: axisWidth(rightTicks),
  };

  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;

  const x = (index: number) =>
    count === 1 ? PAD.left + innerW / 2 : PAD.left + (index * innerW) / (count - 1);
  const y = (value: number, axis: "left" | "right") =>
    PAD.top + innerH - (value / max[axis]) * innerH;
  const xTicks = count > 2 ? [0, Math.floor((count - 1) / 2), count - 1] : [0, count - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label={series.map((s) => s.label).join(", ")}
    >
      <defs>
        {series
          .filter((s) => s.filled)
          .map((s) => (
            <linearGradient key={s.id} id={`fill-${s.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
      </defs>

      {ticks.map((t, i) => {
        const yy = PAD.top + innerH - t * innerH;
        return (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={yy}
              y2={yy}
              stroke="var(--line2)"
            />
            <text
              x={PAD.left - 8}
              y={yy + 3.5}
              textAnchor="end"
              fill="var(--dim)"
              fontSize={TICK_FONT}
            >
              {leftTicks[i]}
            </text>
            {rightTicks.length > 0 && (
              <text
                x={PAD.left + innerW + 8}
                y={yy + 3.5}
                fill="var(--dim)"
                fontSize={TICK_FONT}
              >
                {rightTicks[i]}
              </text>
            )}
          </g>
        );
      })}

      {xTicks.map((index) => (
        <text
          key={index}
          x={x(index)}
          y={height - 8}
          textAnchor={index === 0 ? "start" : index === count - 1 ? "end" : "middle"}
          fill="var(--dim)"
          fontSize="10"
        >
          {formatLabel(labels[index])}
        </text>
      ))}

      {series.map((s) => {
        const axis = s.axis ?? "left";
        const line = s.values
          .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v, axis).toFixed(1)}`)
          .join(" ");

        return (
          <g key={s.id}>
            {s.filled && (
              <path
                d={`${line} L${x(count - 1).toFixed(1)} ${PAD.top + innerH} L${x(0).toFixed(1)} ${PAD.top + innerH} Z`}
                fill={`url(#fill-${s.id})`}
              />
            )}
            <path
              d={line}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* Unsichtbare Spalten mit <title>: der Browser zeigt die Tagwerte als
          eigenen Tooltip, ohne dass Javascript in den Client wandert. */}
      {labels.map((label, i) => (
        <rect
          key={label}
          x={x(i) - innerW / (2 * Math.max(count - 1, 1))}
          y={PAD.top}
          width={innerW / Math.max(count - 1, 1)}
          height={innerH}
          fill="transparent"
        >
          <title>
            {[
              formatLabel(label),
              ...series.map(
                (s) =>
                  `${s.label}: ${(s.axis === "right" && formatRight ? formatRight : formatLeft)(s.values[i])}`,
              ),
            ].join("\n")}
          </title>
        </rect>
      ))}
    </svg>
  );
}

export function Legend({ series }: { series: Pick<Series, "id" | "label" | "color">[] }) {
  return (
    <ul className="flex flex-wrap gap-4">
      {series.map((s) => (
        <li key={s.id} className="flex items-center gap-1.5 text-xs text-dim">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: s.color }}
          />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

export function Funnel({
  steps,
  stepLabel,
}: {
  steps: { label: string; value: string; share: number; conversion: string | null }[];
  stepLabel: string;
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-dim">{step.label}</span>
            <span className="font-semibold tabular-nums">{step.value}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(step.share * 100, 0.6)}%`,
                background: "var(--s-umsatz)",
              }}
            />
          </div>
          {step.conversion && (
            <p className="mt-1 text-xs text-dim">
              {stepLabel}: <span className="tabular-nums">{step.conversion}</span>
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

export function BarList({
  items,
}: {
  items: {
    id: string;
    label: string;
    value: string;
    share: number;
    href?: string;
    color?: string;
  }[];
}) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate" title={item.label}>
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums">{item.value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(item.share * 100, 0.6)}%`,
                  background: item.color ?? "var(--s-umsatz)",
                }}
              />
            </div>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <a href={item.href} className="block text-txt no-underline hover:text-acc">
                {body}
              </a>
            ) : (
              body
            )}
          </li>
        );
      })}
    </ul>
  );
}
