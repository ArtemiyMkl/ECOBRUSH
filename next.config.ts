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
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ir.ozone.ru" },
      { protocol: "https", hostname: "api-seller.ozon.ru" },
    ],
  },
};

export default nextConfig;
