/** Das Zeichen als Geometrie, nicht als Pixel: gezeichnet auf einem 512er-Raster
 *  und aus derselben Kontur für Favicon, Home-Bildschirm-Symbol und Seitenleiste
 *  benutzt. Vorher war jede Grösse eine eigene, hochgerechnete PNG — deshalb sah
 *  das Symbol bei jeder Grösse ausser der Ausgangsgrösse weich aus. */
export const MARK_VIEWBOX = "0 0 512 512";

export const BRAND_GREEN = "#0f6b3d";

/** Aussenkontur des Monogramms. Die drei Balken stehen nach links über — der
 *  obere und der untere weit und schräg angeschnitten, der mittlere kurz. */
const GLYPH =
  "M96 108H336C396 108 424 140 424 192C424 232 404 252 372 256C404 260 424 280 424 320C424 372 396 404 336 404H96L128 356H208V284H160V228H208V156H128Z";

/** Die beiden Punzen des B. Oben und unten liegen sie bündig an den Balken,
 *  gerundet ist nur die rechte Seite. */
const COUNTERS =
  "M280 156H312C344 156 356 172 356 192C356 212 344 228 312 228H280ZM280 284H312C344 284 356 300 356 320C356 340 344 356 312 356H280Z";

const DISC = "M256 0A256 256 0 1 0 256 512A256 256 0 1 0 256 0Z";

/** Scheibe, Kontur und Punzen in einem Pfad: mit `evenodd` wird das Monogramm
 *  aus der Scheibe gestanzt und die Punzen bleiben stehen. Das Zeichen nimmt
 *  dadurch die Farbe des Untergrunds an, statt ein Weiss mitzubringen, das im
 *  hellen Anstrich verschwände. */
export const MARK_KNOCKOUT_PATH = `${DISC}${GLYPH}${COUNTERS}`;

/** Für Flächen, die schon grün sind: nur das Monogramm, die Punzen als Löcher. */
export const MARK_GLYPH_PATH = `${GLYPH}${COUNTERS}`;

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      aria-hidden="true"
      focusable="false"
      className={`brand-in shrink-0 ${className}`}
    >
      <path fill={BRAND_GREEN} fillRule="evenodd" d={MARK_KNOCKOUT_PATH} />
    </svg>
  );
}
