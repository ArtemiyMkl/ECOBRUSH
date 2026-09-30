import { ImageResponse } from "next/og";
import { BRAND_GREEN, MARK_GLYPH_PATH, MARK_VIEWBOX } from "@/components/brand-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Der Home-Bildschirm rundet selbst und füllt Transparenz mit Schwarz — das
 *  Symbol muss also randlos grün sein und das Monogramm weiss tragen, während in
 *  der App dieselbe Kontur als Aussparung steht. */
const GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}"><path fill="#ffffff" fill-rule="evenodd" d="${MARK_GLYPH_PATH}"/></svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_GREEN,
        }}
      >
        {/* Satori zeichnet kein eingebettetes SVG-Markup, ein Bild aber schon.
            Kleiner als die Fläche, weil iOS die Ecken rundet und ein randloses
            Zeichen sonst gegen den Beschnitt drückt. */}
        <img
          width={Math.round(size.width * 0.82)}
          height={Math.round(size.height * 0.82)}
          src={`data:image/svg+xml;utf8,${encodeURIComponent(GLYPH_SVG)}`}
          alt=""
        />
      </div>
    ),
    size,
  );
}
