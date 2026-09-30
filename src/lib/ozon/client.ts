const SELLER_BASE = "https://api-seller.ozon.ru";
const PERF_BASE = "https://api-performance.ozon.ru";

/** Ohne Seller-Keys fällt die Datenschicht auf die Fixtures zurück. */
export const OZON_LIVE = Boolean(
  process.env.OZON_CLIENT_ID && process.env.OZON_API_KEY,
);

export const OZON_PERF_LIVE = Boolean(
  process.env.OZON_PERF_CLIENT_ID && process.env.OZON_PERF_CLIENT_SECRET,
);

export class OzonError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    body: string,
  ) {
    super(`Ozon ${path} → HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = "OzonError";
  }
}

export async function sellerPost<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${SELLER_BASE}${path}`, {
    method: "POST",
    headers: {
      "Client-Id": process.env.OZON_CLIENT_ID!,
      "Api-Key": process.env.OZON_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new OzonError(res.status, path, await res.text());
  return (await res.json()) as T;
}

/** Performance-Tokens leben eine halbe Stunde; im Prozess zwischengespeichert,
 *  damit nicht jede Werbe-Anfrage einen zweiten Roundtrip bezahlt. */
let perfToken: { value: string; expiresAt: number } | null = null;

async function getPerfToken(): Promise<string> {
  if (perfToken && perfToken.expiresAt > Date.now() + 30_000) {
    return perfToken.value;
  }

  const res = await fetch(`${PERF_BASE}/api/client/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.OZON_PERF_CLIENT_ID,
      client_secret: process.env.OZON_PERF_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new OzonError(res.status, "/api/client/token", await res.text());
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  perfToken = {
    value: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

async function perfFetch(
  path: string,
  init?: { method?: string; body?: unknown; accept?: string },
): Promise<Response> {
  const token = await getPerfToken();
  const res = await fetch(`${PERF_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: init?.accept ?? "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) throw new OzonError(res.status, path, await res.text());
  return res;
}

export async function perfGet<T>(path: string): Promise<T> {
  return (await (await perfFetch(path)).json()) as T;
}

export async function perfPost<T>(path: string, body: unknown): Promise<T> {
  return (await (await perfFetch(path, { method: "POST", body })).json()) as T;
}

/** Der Ausgaben-Report kommt als CSV mit Semikolon und Komma-Dezimalstellen. */
export async function perfGetCsv(path: string): Promise<string> {
  return (await perfFetch(path, { accept: "text/csv" })).text();
}
