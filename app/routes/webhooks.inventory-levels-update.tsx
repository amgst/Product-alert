import type { ActionFunctionArgs } from "react-router";
import prisma from "../db";
import { authenticate } from "../shopify";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  const available = Number((payload as { available?: number }).available ?? 0);
  const inventoryItemId = String((payload as { inventory_item_id?: number }).inventory_item_id ?? "");

  if (shop && available <= 0) {
    await prisma.notificationEvent.create({
      data: {
        shop,
        title: "Inventory reached zero",
        message: `Inventory item ${inventoryItemId} is out of stock.`,
        level: "danger",
      },
    });
  }

  return new Response();
};
