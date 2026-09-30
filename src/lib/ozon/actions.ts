"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { OZON_LIVE, sellerPost } from "./client";
import { ORDERS_TAG } from "./orders";
import { CHATS_TAG } from "./support";
import { withParams } from "@/lib/period";

/** `updateTag` statt `revalidateTag`: der Knopf soll frische Zahlen zeigen,
 *  nicht den alten Stand und im Hintergrund nachladen. */
export async function refreshOrders(): Promise<void> {
  updateTag(ORDERS_TAG);
}

/** Antwort an den Käufer. Ozon nimmt reinen Text, Anhänge laufen über einen
 *  eigenen Endpunkt — den braucht der Verkäufer hier nicht.
 *
 *  Der Ausgang ist immer eine Weiterleitung auf denselben Chat: so steht das
 *  Ergebnis in der URL und ein Neuladen schickt nichts doppelt. */
export async function sendChatMessage(formData: FormData): Promise<void> {
  const chatId = String(formData.get("chatId") ?? "");
  const text = String(formData.get("text") ?? "").trim();

  // Nur Käuferchats haben ein Antwortfeld, der Rückweg führt also in deren Liste.
  const back = (error?: string) =>
    withParams("/customers", { c: chatId, e: error });

  if (!chatId || !text) redirect(back());
  if (!OZON_LIVE) redirect(back("keys"));

  try {
    await sellerPost("/v1/chat/send/message", { chat_id: chatId, text });
  } catch {
    redirect(back("send"));
  }

  updateTag(CHATS_TAG);
  redirect(back());
}
