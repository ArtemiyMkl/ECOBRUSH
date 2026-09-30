import { SegLinks } from "@/components/seg-links";
import type { Dictionary } from "@/lib/i18n/server";
import {
  PRESET_KEYS,
  selectionParams,
  withParams,
  type Range,
  type Selection,
} from "@/lib/period";

/** Voreinstellungen plus ein frei wählbares Datumspaar. Das Aufklappen läuft
 *  über `details`, das Abschicken über ein GET-Formular — beides funktioniert
 *  auch ohne Client-Bundle, und die Auswahl landet in der URL. */
export function RangePicker({
  path,
  selection,
  range,
  keep = {},
  t,
  formatDate,
}: {
  path: string;
  selection: Selection;
  range: Range;
  /** Filter der Seite, die beim Umschalten des Zeitraums erhalten bleiben. */
  keep?: Record<string, string | undefined>;
  t: Dictionary;
  formatDate: (value: string) => string;
}) {
  const custom = selection.kind === "custom";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegLinks
        options={PRESET_KEYS.map((preset) => ({
          href: withParams(path, {
            ...keep,
            ...selectionParams({ kind: "preset", preset }),
          }),
          label: t.range[preset],
          active: !custom && selection.preset === preset,
        }))}
      />

      <details className="relative">
        {/* `.seg` ist inline-flex — das unterdrückt das Aufklapp-Dreieck. */}
        <summary className="seg cursor-pointer list-none">
          <span
            aria-pressed={custom}
            className="seg-item px-3 py-1 text-xs whitespace-nowrap"
          >
            {custom
              ? `${formatDate(range.from)} — ${formatDate(range.to)}`
              : t.range.custom}
          </span>
        </summary>

        <form
          action={path}
          className="panel absolute right-0 z-20 mt-2 flex w-max items-end gap-2 p-3"
        >
          {Object.entries(keep).map(
            ([name, value]) =>
              value && <input key={name} type="hidden" name={name} value={value} />,
          )}

          <label className="flex flex-col gap-1 text-xs text-dim">
            {t.range.from}
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              max={range.to}
              required
              className="field px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-dim">
            {t.range.to}
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              required
              className="field px-2 py-1 text-sm"
            />
          </label>

          <button type="submit" className="btn btn-accent px-3 py-1.5 text-sm">
            {t.range.apply}
          </button>
        </form>
      </details>

      <span className="text-xs text-dim">
        {range.days} {t.range.days}
      </span>
    </div>
  );
}
