import type { ActionFunctionArgs } from "react-router";
import prisma from "../db";
import { authenticate } from "../shopify";
import { notifyLowStock } from "../notifications.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload } = await authenticate.webhook(request);
  const available = Number((payload as { available?: number }).available ?? 0);
  const inventoryItemId = String((payload as { inventory_item_id?: number }).inventory_item_id ?? "");

  if (shop && inventoryItemId) {
    const defaultRule = await prisma.alertRule.findFirst({ where: { shop, active: true } });
    const threshold = defaultRule?.defaultMinimum ?? 15;

    const isOutOfStock = available <= 0;
    const isLowStock = available <= threshold;

    if (isOutOfStock || isLowStock) {
      const level = isOutOfStock ? "danger" : "warning";
      const title = isOutOfStock ? "Inventory Out of Stock" : "Low Stock Alert";
      const message = isOutOfStock
        ? `Item ${inventoryItemId} has reached 0 units.`
        : `Item ${inventoryItemId} is low on stock (${available} units remaining; threshold: ${threshold}).`;

      const event = await prisma.notificationEvent.create({
        data: { shop, title, message, level },
      });

      await notifyLowStock({ shop, eventId: event.id, title, message });
    }
  }

  return new Response();
};
