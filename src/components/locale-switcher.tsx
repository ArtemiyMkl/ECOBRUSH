import { setLocale } from "@/lib/i18n/actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

export function LocaleSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  return (
    <form action={setLocale} className="seg w-full" aria-label={label}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="submit"
          name="locale"
          value={code}
          aria-pressed={code === locale}
          className="seg-item flex-1 py-1 text-xs"
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </form>
  );
}
