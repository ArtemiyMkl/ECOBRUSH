/** Eigene Strichzeichnungen statt einer Icon-Abhängigkeit: alle im gleichen
 *  24er-Raster, 1.6 Strichbreite, Farbe immer currentColor — damit sie sich
 *  wie Text verhalten und keinen eigenen Farbkanal aufmachen. */
type IconProps = { className?: string };

function Svg({
  className = "h-4 w-4",
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconRevenue(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 20V4h4.5a4 4 0 0 1 0 8H9" />
      <path d="M6 16h9" />
    </Svg>
  );
}

export function IconUnits(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </Svg>
  );
}

export function IconViews(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </Svg>
  );
}

export function IconCart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 4h2.2l2.3 10.5h9.8" />
      <path d="M6.6 7.5H21l-2 6H8" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17.5" cy="19" r="1.4" />
    </Svg>
  );
}

export function IconAd(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10v4l11 5V5L4 10z" />
      <path d="M18 9.5a3.5 3.5 0 0 1 0 5" />
    </Svg>
  );
}

export function IconChat(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 5h16v11H9.5L4 20V5z" />
      <path d="M8 10h8" />
    </Svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5l2.7 5.5 6 .9-4.35 4.25 1.03 6-5.38-2.85L6.6 20.15l1.03-6L3.3 9.9l6-.9L12 3.5z" />
    </Svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4l9 15.5H3L12 4z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconStock(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9.5L12 4l9 5.5V20H3V9.5z" />
      <path d="M9 20v-6h6v6" />
    </Svg>
  );
}

export function IconPercent(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 5L5 19" />
      <circle cx="7.5" cy="7.5" r="2.5" />
      <circle cx="16.5" cy="16.5" r="2.5" />
    </Svg>
  );
}

export function IconReturn(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 5L4 9l4 4" />
      <path d="M4 9h11a4.5 4.5 0 0 1 0 9H9" />
    </Svg>
  );
}

export function IconCancel(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.8 8.8l6.4 6.4" />
      <path d="M15.2 8.8l-6.4 6.4" />
    </Svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12.5 3.5H20v7.5l-8.5 8.5a2 2 0 0 1-2.8 0l-4.7-4.7a2 2 0 0 1 0-2.8l8.5-8.5z" />
      <path d="M16.5 7.5h.01" />
    </Svg>
  );
}

export function IconGlobe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5z" />
    </Svg>
  );
}

/** Kleiner Richtungspfeil für Veränderungen — bewusst 12er-Raster, damit er
 *  neben der Prozentzahl nicht wie ein eigenes Symbol wirkt. */
export function IconTrend({
  direction,
  className = "h-3 w-3",
}: {
  direction: "up" | "down";
  className?: string;
}) {
  return (
    <svg aria-hidden viewBox="0 0 12 12" fill="currentColor" className={className}>
      {direction === "up" ? (
        <path d="M6 2.5l4 6H2l4-6z" />
      ) : (
        <path d="M6 9.5l-4-6h8l-4 6z" />
      )}
    </svg>
  );
}
