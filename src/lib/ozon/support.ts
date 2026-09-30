import { cacheLife, cacheTag } from "next/cache";
import { OZON_LIVE, sellerPost } from "./client";
import { loadFixture } from "./fixtures";
import type { ChatAuthor, ChatMessage, ChatSummary } from "./types";

export const CHATS_TAG = "ozon-chats";

type ChatListResponse = {
  chats: {
    unread_count: number;
    chat: {
      chat_id: string;
      chat_status: string;
      chat_type: string;
      created_at: string;
    };
  }[];
};

export async function getChats(): Promise<ChatSummary[]> {
  "use cache";
  cacheLife("ozon");
  cacheTag(CHATS_TAG);

  const raw = OZON_LIVE
    ? await sellerPost<ChatListResponse>("/v3/chat/list", {
        filter: { chat_status: "OPENED", unread_only: false },
        limit: 100,
        cursor: "",
      })
    : await loadFixture<ChatListResponse>("chats-list.json");

  return raw.chats.map((entry) => ({
    id: entry.chat.chat_id,
    // Nur BUYER_SELLER sind echte Käuferdialoge; UNSPECIFIED und
    // SELLER_API_UPDATES sind Ozons eigene Kanäle mit aufgeblähten
    // Ungelesen-Zählern.
    kind: entry.chat.chat_type === "BUYER_SELLER" ? "buyer" : "system",
    rawType: entry.chat.chat_type,
    status: entry.chat.chat_status,
    createdAt: entry.chat.created_at,
    unreadCount: entry.unread_count,
  }));
}

type HistoryResponse = {
  messages: {
    message_id: number;
    user: { id: string; type: string };
    created_at: string;
    data: string[];
    context: { sku: string };
    is_image: boolean;
  }[];
};

const AUTHORS: Record<string, ChatAuthor> = {
  Customer: "customer",
  Seller: "seller",
  ChatBot: "support",
  Support: "support",
  Crm: "support",
};

const IMAGE_MARKDOWN = /!\[\]\((.+?)\)/g;
const CHAT_FILE_PREFIX = "https://api-seller.ozon.ru/v2/chat/file/";

/** Anhänge liegen hinter der Seller-Authentifizierung und sind für den Browser
 *  direkt nicht erreichbar — ausgeliefert werden sie über die eigene Route. */
function toProxyUrl(url: string): string {
  return url.startsWith(CHAT_FILE_PREFIX)
    ? `/api/chat-file/${url.slice(CHAT_FILE_PREFIX.length)}`
    : url;
}

function normalize(message: HistoryResponse["messages"][number]): ChatMessage {
  const images: string[] = [];
  const text: string[] = [];

  for (const chunk of message.data) {
    if (!chunk) continue;
    const matches = [...chunk.matchAll(IMAGE_MARKDOWN)];
    if (matches.length > 0) {
      images.push(...matches.map((m) => toProxyUrl(m[1])));
    } else {
      text.push(chunk);
    }
  }

  return {
    id: String(message.message_id),
    author: AUTHORS[message.user.type] ?? "support",
    createdAt: message.created_at,
    text: text.join("\n"),
    images,
    sku: message.context?.sku ?? "",
  };
}

export async function getChatHistory(chatId: string): Promise<ChatMessage[]> {
  "use cache";
  cacheLife("ozon");
  cacheTag(CHATS_TAG);

  if (!OZON_LIVE) {
    const all =
      await loadFixture<Record<string, HistoryResponse>>("chat-histories.json");
    const history = all[chatId];
    if (!history) return [];
    return history.messages.map(normalize).reverse();
  }

  const raw = await sellerPost<HistoryResponse>("/v3/chat/history", {
    chat_id: chatId,
    direction: "Backward",
    limit: 50,
  });

  // Ozon liefert neueste zuerst; im Verlauf soll älteste oben stehen.
  return raw.messages.map(normalize).reverse();
}
