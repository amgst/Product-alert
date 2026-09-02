import prisma from "./db";
import type { ProductThreshold } from "@prisma/client";
import type { ProductRow } from "./inventory.shared";

type ShopifyVariant = {
  id: string;
  title: string;
  sku: string | null;
  inventoryQuantity: number | null;
};

type ShopifyProduct = {
  id: string;
  title: string;
  variants: {
    nodes: ShopifyVariant[];
  };
};

export async function loadInventoryRows(admin: { graphql: (query: string) => Promise<Response> }, shop: string) {
  const response = await admin.graphql(`
    #graphql
    query MinStockProducts {
      products(first: 25, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          title
          variants(first: 20) {
            nodes {
              id
              title
              sku
              inventoryQuantity
            }
          }
        }
      }
    }
  `);
  const payload = (await response.json()) as { data: { products: { nodes: ShopifyProduct[] } } };
  const thresholds = await prisma.productThreshold.findMany({ where: { shop } });
  const thresholdMap = new Map(
    thresholds.map((item: ProductThreshold) => [`${item.productId}:${item.variantId ?? ""}`, item]),
  );

  return payload.data.products.nodes.flatMap((product) =>
    product.variants.nodes.map((variant) => {
      const saved = thresholdMap.get(`${product.id}:${variant.id}`);
      const available = variant.inventoryQuantity ?? 0;

      return {
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title,
        sku: variant.sku || "No SKU",
        available,
        committed: 0,
        minimumStock: saved?.minimumStock ?? 15,
        reorderQuantity: saved?.reorderQuantity ?? 50,
        watchEnabled: saved?.watchEnabled ?? true,
      } satisfies ProductRow;
    }),
  );
}

export async function ensureDefaultRule(shop: string) {
  const existing = await prisma.alertRule.findFirst({ where: { shop } });

  if (existing) return existing;

  return prisma.alertRule.create({
    data: {
      shop,
      name: "Store-wide low stock",
      recipients: "owner@example.com",
      defaultMinimum: 15,
    },
  });
}
