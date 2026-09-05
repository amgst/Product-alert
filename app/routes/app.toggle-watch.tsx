import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify";
import prisma from "../db";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const productId = String(formData.get("productId") || "");
  const variantId = String(formData.get("variantId") || "");
  if (!productId || !variantId) {
    return { ok: false, error: "Missing product identifiers" };
  }

  const watchEnabled = formData.get("watchEnabled") === "true";
  const sku = String(formData.get("sku") || "");
  const productTitle = String(formData.get("productTitle") || "");
  const variantTitle = String(formData.get("variantTitle") || "");

  await prisma.productThreshold.upsert({
    where: {
      shop_productId_variantId: { shop: session.shop, productId, variantId },
    },
    update: { watchEnabled },
    create: {
      shop: session.shop,
      productId,
      variantId,
      sku,
      productTitle,
      variantTitle,
      watchEnabled,
      minimumStock: 15,
      reorderQuantity: 50,
    },
  });

  return { ok: true };
};
