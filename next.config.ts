import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ozon-Analytics erlaubt 1 Anfrage pro Minute — ohne "use cache" wäre
  // jede Seitenansicht ein Treffer ins Limit.
  cacheComponents: true,
  cacheLife: {
    ozon: {
      stale: 300,
      revalidate: 1800,
      expire: 86400,
    },
    // Bestellungen: die Posting-Endpunkte haben weiche Limits, hier zählt
    // Aktualität. `expire` bleibt bei 300 — darunter fällt der Abschnitt aus
    // dem Prerender und jeder Aufruf wartet auf Ozon.
    live: {
      stale: 30,
      revalidate: 60,
      expire: 300,
    },
    // Abgeschlossene Monate. Sie ändern sich nie wieder, kosten aber ein gutes
    // Dutzend Anfragen — deshalb hält der Eintrag, bis ein neuer Monat einen
    // neuen Schlüssel erzeugt, und wird dabei nie blockierend nachgeladen.
    history: {
      stale: 3600,
      revalidate: 86400,
      expire: 2592000,
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ir.ozone.ru" },
      { protocol: "https", hostname: "api-seller.ozon.ru" },
    ],
  },
};

export default nextConfig;
