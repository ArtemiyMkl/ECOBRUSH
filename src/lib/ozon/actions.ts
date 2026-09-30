"use server";

import { updateTag } from "next/cache";
import { ORDERS_TAG } from "./orders";

/** `updateTag` statt `revalidateTag`: der Knopf soll frische Zahlen zeigen,
 *  nicht den alten Stand und im Hintergrund nachladen. */
export async function refreshOrders(): Promise<void> {
  updateTag(ORDERS_TAG);
}
