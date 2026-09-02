import prisma from "./db.server";
import type { ProductThreshold } from "@prisma/client";

export type ProductRow = {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku: string;
  available: number;
  committed: number;
  minimumStock: number;
  reorderQuantity: number;
  watchEnabled: boolean;
};

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

export function getStatus(row: ProductRow) {
  if (!row.watchEnabled) return { label: "Muted", tone: "muted" };
  if (row.available <= 0) return { label: "Out", tone: "danger" };
  if (row.available <= row.minimumStock) return { label: "Low", tone: "danger" };
  if (row.available <= row.minimumStock + 5) return { label: "Near", tone: "warning" };
  return { label: "Healthy", tone: "ok" };
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
