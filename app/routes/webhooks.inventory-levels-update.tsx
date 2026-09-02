import type { ActionFunctionArgs } from "react-router";
import prisma from "../db";
import { authenticate } from "../shopify";
import { notifyLowStock } from "../notifications.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  const available = Number((payload as { available?: number }).available ?? 0);
  const inventoryItemId = String((payload as { inventory_item_id?: number }).inventory_item_id ?? "");

  if (shop && available <= 0) {
    const title = "Inventory reached zero";
    const message = `Inventory item ${inventoryItemId} is out of stock.`;

    const event = await prisma.notificationEvent.create({
      data: { shop, title, message, level: "danger" },
    });

    await notifyLowStock({ shop, eventId: event.id, title, message });
  }

  return new Response();
};
