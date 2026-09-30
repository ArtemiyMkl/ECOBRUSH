import Link from "next/link";
import { PageHeader, Panel } from "@/components/page-header";
import { Photo } from "@/components/photo";
import { SegLinks } from "@/components/seg-links";
import { Kpi, KpiGrid } from "@/components/kpi";
import { IconChat, IconImage, IconSend, IconStar } from "@/components/icons";
import { getTranslations, type Dictionary } from "@/lib/i18n/server";
import { createFormatters } from "@/lib/format";
import { withParams } from "@/lib/period";
import { getChatHistory, getChats } from "@/lib/ozon/support";
import { getSellerRating } from "@/lib/ozon/catalog";
import { sendChatMessage } from "@/lib/ozon/actions";
import { OZON_LIVE } from "@/lib/ozon/client";
import type { ChatAuthor, ChatKind } from "@/lib/ozon/types";

function authorLabel(author: ChatAuthor, t: Dictionary): string {
  return {
    customer: t.customers.messageFromCustomer,
    seller: t.customers.messageFromSeller,
    support: t.customers.messageFromSupport,
  }[author];
}

export default async function CustomersPage({
  searchParams,
}: PageProps<"/customers">) {
  const { t, locale } = await getTranslations();
  const f = createFormatters(locale);
  const params = await searchParams;
  const kind: ChatKind = params.k === "system" ? "system" : "buyer";
  const sendError = params.e === "keys" || params.e === "send" ? params.e : null;

  const [chats, rating] = await Promise.all([getChats(), getSellerRating()]);

  const listed = chats
    .filter((chat) => chat.kind === kind)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const selectedId =
    typeof params.c === "string" && listed.some((chat) => chat.id === params.c)
      ? params.c
      : (listed[0]?.id ?? null);

  const messages = selectedId ? await getChatHistory(selectedId) : [];
  const buyerChats = chats.filter((chat) => chat.kind === "buyer");
  const unreadBuyer = buyerChats.filter((chat) => chat.unreadCount > 0);
  const kindParam = kind === "buyer" ? undefined : kind;

  return (
    <>
      <PageHeader
        title={t.customers.title}
        description={t.customers.subtitle}
        actions={
          <SegLinks
            options={[
              {
                href: "/customers",
                label: t.customers.buyerChats,
                active: kind === "buyer",
              },
              {
                href: withParams("/customers", { k: "system" }),
                label: t.customers.systemChats,
                active: kind === "system",
              },
            ]}
          />
        }
      />

      <KpiGrid>
        <Kpi
          icon={<IconChat />}
          label={t.customers.buyerChats}
          value={f.integer(buyerChats.length)}
        />
        <Kpi
          icon={<IconChat />}
          label={t.kpi.unreadChats}
          value={f.integer(unreadBuyer.length)}
        />
        <Kpi
          icon={<IconStar />}
          label={t.kpi.rating}
          value={f.decimal(rating.productScore)}
        />
        <Kpi
          icon={<IconStar />}
          label={t.customers.reviews}
          value="—"
          hint={t.customers.reviewsUnavailable}
        />
      </KpiGrid>

      <div className="mt-5 grid gap-4 xl:grid-cols-[20rem_1fr]">
        <Panel title={t.customers.chats}>
          {listed.length === 0 ? (
            <p className="text-sm text-dim">{t.common.noData}</p>
          ) : (
            <ul className="scroll-area max-h-[32rem] space-y-1 overflow-y-auto">
              {listed.map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={withParams("/customers", {
                      k: kindParam,
                      c: chat.id,
                    })}
                    aria-current={chat.id === selectedId ? "page" : undefined}
                    className="nav-link flex items-center justify-between gap-2 px-3 py-2 text-sm no-underline"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        {f.dayMonthYear(chat.createdAt)}
                      </span>
                      <span className="block truncate text-xs text-dim">
                        {chat.id.slice(0, 8)}
                      </span>
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="chip shrink-0" data-tone="acc">
                        {f.integer(chat.unreadCount)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t.customers.conversation}
          aside={
            selectedId ? (
              <span className="text-xs text-dim">{selectedId.slice(0, 8)}</span>
            ) : undefined
          }
        >
          {messages.length === 0 ? (
            <p className="text-sm text-dim">{t.customers.selectChat}</p>
          ) : (
            <ol className="space-y-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={
                    message.author === "customer" ? "" : "flex justify-end"
                  }
                >
                  <div
                    className="bubble max-w-[80%]"
                    data-author={message.author}
                  >
                    <p className="mb-1 flex items-baseline gap-2 text-xs opacity-70">
                      <span>{authorLabel(message.author, t)}</span>
                      <span>{f.dateTime(message.createdAt)}</span>
                    </p>
                    {message.text && (
                      <p className="text-sm whitespace-pre-line">
                        {message.text}
                      </p>
                    )}
                    {message.images.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {/* Anhänge liegen hinter der Seller-Anmeldung. Ohne
                            Schlüssel gäbe es nur ein kaputtes Bild, deshalb
                            steht hier eine Kachel, die den Grund nennt. */}
                        {message.images.map((src, index) =>
                          OZON_LIVE ? (
                            <Photo
                              key={src}
                              id={`chat-${message.id}-${index}`}
                              src={src}
                              alt={t.customers.imageAttachment}
                              size={96}
                              className="h-24 w-24"
                              unoptimized
                              t={t}
                            />
                          ) : (
                            <span
                              key={src}
                              title={t.customers.photosNeedKeys}
                              className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-md border border-line bg-raised p-2 text-center text-[0.625rem] leading-tight text-dim"
                            >
                              <IconImage className="h-5 w-5" />
                              {t.customers.imageAttachment}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                    {message.sku && (
                      <Link
                        href={`/products/${message.sku}`}
                        className="mt-2 inline-block text-xs"
                      >
                        {t.customers.aboutProduct} · {message.sku}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}

          {selectedId && kind === "buyer" && (
            <form
              action={sendChatMessage}
              className="mt-4 flex items-end gap-2 border-t border-line2 pt-4"
            >
              <input type="hidden" name="chatId" value={selectedId} />
              <textarea
                name="text"
                rows={2}
                required
                maxLength={1000}
                placeholder={t.customers.replyPlaceholder}
                className="field min-w-0 flex-1 resize-y px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="btn btn-accent inline-flex items-center gap-1.5 px-3 py-2 text-sm"
              >
                <IconSend className="h-4 w-4" />
                <span className="max-sm:sr-only">{t.customers.send}</span>
              </button>
            </form>
          )}

          {selectedId && kind === "system" && (
            <p className="mt-4 border-t border-line2 pt-4 text-xs text-dim">
              {t.customers.sendOnlyBuyer}
            </p>
          )}

          {sendError && (
            <p className="mt-2 text-xs text-bad" role="status">
              {sendError === "keys"
                ? t.customers.sendNoKeys
                : t.customers.sendFailed}
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
