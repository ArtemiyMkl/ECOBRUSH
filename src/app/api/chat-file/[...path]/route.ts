import { OZON_LIVE } from "@/lib/ozon/client";

/** Chat-Anhänge liegen hinter der Seller-API und brauchen die Ozon-Header — der
 *  Browser kann sie nie direkt laden. Der Pfad wird aus den Segmenten neu
 *  zusammengesetzt, damit hier kein beliebiges Ziel abrufbar ist. */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/chat-file/[...path]">,
) {
  if (!OZON_LIVE) return new Response(null, { status: 404 });

  const { path } = await ctx.params;
  const target = `https://api-seller.ozon.ru/v2/chat/file/${path
    .map(encodeURIComponent)
    .join("/")}`;

  const upstream = await fetch(target, {
    headers: {
      "Client-Id": process.env.OZON_CLIENT_ID!,
      "Api-Key": process.env.OZON_API_KEY!,
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(null, { status: 404 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
