import type { ActionFunctionArgs } from "react-router";
import prisma from "../db";
import { authenticate } from "../shopify";
import { notifyLowStock } from "../notifications.server";

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type InventoryItemLookup = {
  data?: {
    inventoryItem?: {
      variant?: {
        id: string;
        title: string;
        inventoryQuantity: number | null;
        product: { id: string; title: string };
      } | null;
    } | null;
  };
  errors?: unknown;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, payload, admin } = await authenticate.webhook(request);

  if (!shop || !admin) return new Response();

  const inventoryItemId = String((payload as { inventory_item_id?: number }).inventory_item_id ?? "");
  if (!inventoryItemId) return new Response();

  const response = await admin.graphql(
    `#graphql
    query InventoryItemLookup($id: ID!) {
      inventoryItem(id: $id) {
        variant {
          id
          title
          inventoryQuantity
          product { id title }
        }
      }
    }`,
    { variables: { id: `gid://shopify/InventoryItem/${inventoryItemId}` } },
  );
  const result = (await response.json()) as InventoryItemLookup;
  if (result.errors) {
    console.error(`InventoryItemLookup GraphQL error for shop ${shop}:`, JSON.stringify(result.errors));
    // Fail loudly so Shopify retries the webhook instead of silently dropping the alert.
    throw new Response("Inventory lookup failed", { status: 500 });
  }

  const variant = result?.data?.inventoryItem?.variant;
  if (!variant) return new Response();

  const productId = variant.product.id;
  const variantId = variant.id;
  // Aggregate quantity across all locations, matching the dashboard's numbers —
  // the webhook payload's `available` is only for the one location that changed.
  const available = variant.inventoryQuantity ?? 0;

  const [threshold, defaultRule] = await Promise.all([
    prisma.productThreshold.findUnique({
      where: { shop_productId_variantId: { shop, productId, variantId } },
    }),
    prisma.alertRule.findFirst({ where: { shop, active: true } }),
  ]);

  if (threshold && !threshold.watchEnabled) return new Response();

  const minimum = threshold?.minimumStock ?? defaultRule?.defaultMinimum ?? 15;
  if (available > minimum) return new Response();

  const isOutOfStock = available <= 0;
  const level = isOutOfStock ? "danger" : "warning";

  const recentAlert = await prisma.notificationEvent.findFirst({
    where: { shop, productId, variantId },
    orderBy: { sentAt: "desc" },
  });
  const withinCooldown =
    !!recentAlert && Date.now() - recentAlert.sentAt.getTime() < ALERT_COOLDOWN_MS;
  // Let a fresh out-of-stock alert through even mid-cooldown if the last alert was only a warning.
  const isEscalation = withinCooldown && recentAlert!.level !== "danger" && level === "danger";
  if (withinCooldown && !isEscalation) {
    return new Response();
  }

  const title = isOutOfStock ? "Inventory Out of Stock" : "Low Stock Alert";
  const productLabel =
    variant.title && variant.title !== "Default Title"
      ? `${variant.product.title} (${variant.title})`
      : variant.product.title;
  const message = isOutOfStock
    ? `${productLabel} has reached 0 units.`
    : `${productLabel} is low on stock (${available} units remaining; threshold: ${minimum}).`;

  const event = await prisma.notificationEvent.create({
    data: { shop, productId, variantId, title, message, level },
  });

  await notifyLowStock({ shop, eventId: event.id, title, message });

  return new Response();
};
