import Link from "next/link";
import { IconCalendar, IconChevron, IconClose } from "@/components/icons";
import type { Dictionary } from "@/lib/i18n/server";
import type { Formatters } from "@/lib/format";
import {
  PRESET_KEYS,
  selectionParams,
  withParams,
  type Range,
  type Selection,
} from "@/lib/period";

/** Ein Knopf statt einer Reihe von neun: die Wahl des Zeitraums ist selten,
 *  die Zahlen darunter sind es nicht. Aufgeklappt wird über das native
 *  `popover` — Top-Layer, Escape und Klick daneben bringt der Browser mit,
 *  ohne Client-Bündel, und der Hintergrund darf unscharf werden. */
export function RangePicker({
  path,
  selection,
  range,
  keep = {},
  t,
  f,
  id = "range-pop",
}: {
  path: string;
  selection: Selection;
  range: Range;
  /** Filter der Seite, die beim Umschalten des Zeitraums erhalten bleiben. */
  keep?: Record<string, string | undefined>;
  t: Dictionary;
  f: Formatters;
  id?: string;
}) {
  const custom = selection.kind === "custom";
  const span = f.dateSpan(range.from, range.to);

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        className="btn btn-quiet flex max-w-full items-center gap-2 px-3 py-1.5 text-sm"
      >
        <IconCalendar className="h-4 w-4 shrink-0 text-dim" />
        <span className="min-w-0 truncate">
          {custom ? span : t.range[selection.preset]}
        </span>
        <span className="shrink-0 text-xs text-dim max-sm:hidden">
          {custom ? `${range.days} ${t.range.days}` : span}
        </span>
        <IconChevron className="h-3.5 w-3.5 shrink-0 text-dim" />
      </button>

      {/* Der Schlüssel hängt an der Auswahl: nach einem Klick baut React den
          Knoten neu auf, und ein frischer Popover startet geschlossen. Sonst
          bliebe die Wahl offen über den Zahlen liegen, die sie gerade ändert. */}
      <div key={span} popover="auto" id={id} className="pop">
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold">{t.range.title}</p>
          <button
            type="button"
            popoverTarget={id}
            popoverTargetAction="hide"
            aria-label={t.common.close}
            className="btn btn-quiet p-1.5"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        {/* Voreinstellungen als Raster: acht Schaltflächen in einer Reihe
            brechen unschön um, als Raster stehen sie in Spalten. */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {PRESET_KEYS.map((preset) => {
            const active = !custom && selection.preset === preset;
            return (
              <Link
                key={preset}
                href={withParams(path, {
                  ...keep,
                  ...selectionParams({ kind: "preset", preset }),
                })}
                aria-current={active ? "true" : undefined}
                className={`btn justify-center px-2 py-2 text-center text-xs no-underline ${
                  active ? "btn-accent" : "btn-quiet"
                }`}
              >
                {t.range[preset]}
              </Link>
            );
          })}
        </div>

        <form
          action={path}
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-line2 pt-3"
        >
          {Object.entries(keep).map(
            ([name, value]) =>
              value && (
                <input key={name} type="hidden" name={name} value={value} />
              ),
          )}

          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-dim">
            {t.range.from}
            <input
              type="date"
              name="from"
              defaultValue={range.from}
              max={range.to}
              required
              className="field w-full px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-dim">
            {t.range.to}
            <input
              type="date"
              name="to"
              defaultValue={range.to}
              required
              className="field w-full px-2 py-1.5 text-sm"
            />
          </label>

          <button
            type="submit"
            className="btn btn-accent px-3 py-1.5 text-sm max-sm:w-full max-sm:justify-center"
          >
            {t.range.apply}
          </button>
        </form>
      </div>
    </>
  );
}
