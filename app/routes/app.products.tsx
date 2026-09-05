import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";
import { PageHeader, ProductTable } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { getStoreProductCount, listAllProductSummaries, loadInventoryRows } from "../inventory";
import type { ProductRow } from "../inventory.shared";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const [rows, productCount, allSummaries] = await Promise.all([
    loadInventoryRows(admin, session.shop),
    getStoreProductCount(admin, session.shop),
    listAllProductSummaries(admin, session.shop),
  ]);
  const monitoredIds = new Set(rows.map((row: ProductRow) => row.productId));

  return {
    rows,
    shop: session.shop,
    monitoring: {
      monitored: monitoredIds.size,
      total: productCount?.count ?? null,
      isExact: productCount?.isExact ?? true,
    },
    unmonitored: {
      products: (allSummaries?.products ?? []).filter((product) => !monitoredIds.has(product.id)),
      hasMore: allSummaries?.hasMore ?? false,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const prefix = "productId:";
  const indexes = [...formData.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => key.slice(prefix.length));

  function parseQty(val: FormDataEntryValue | null, fallback = 0): number {
    const parsed = parseInt(String(val ?? ""), 10);
    return isNaN(parsed) ? fallback : Math.max(0, parsed);
  }

  await Promise.all(
    indexes.map((index) => {
      const productId = String(formData.get(`productId:${index}`) || "");
      const variantId = String(formData.get(`variantId:${index}`) || "");

      const minimumStock = parseQty(formData.get(`minimumStock:${index}`), 15);
      const reorderQuantity = parseQty(formData.get(`reorderQuantity:${index}`), 50);

      return prisma.productThreshold.upsert({
        where: {
          shop_productId_variantId: {
            shop: session.shop,
            productId,
            variantId,
          },
        },
        update: {
          sku: String(formData.get(`sku:${index}`) || ""),
          productTitle: String(formData.get(`productTitle:${index}`) || ""),
          variantTitle: String(formData.get(`variantTitle:${index}`) || ""),
          minimumStock,
          reorderQuantity,
          // watchEnabled is saved instantly by its own toggle (app.toggle-watch.tsx)
          // and intentionally left untouched here.
        },
        create: {
          shop: session.shop,
          productId,
          variantId,
          sku: String(formData.get(`sku:${index}`) || ""),
          productTitle: String(formData.get(`productTitle:${index}`) || ""),
          variantTitle: String(formData.get(`variantTitle:${index}`) || ""),
          minimumStock,
          reorderQuantity,
          watchEnabled: true,
        },
      });
    }),
  );

  return redirect("/app/products");
};

export default function Products() {
  const { rows, shop, monitoring, unmonitored } = useLoaderData<typeof loader>();
  const notMonitored = monitoring.total !== null ? Math.max(0, monitoring.total - monitoring.monitored) : null;
  const plus = monitoring.isExact ? "" : "+";
  const [tab, setTab] = useState<"monitored" | "unmonitored">("monitored");

  return (
    <>
      <PageHeader eyebrow="Catalog thresholds" title="Products">
        {tab === "monitored" && (
          <button className="ghost" type="submit" form="products-form">Save thresholds</button>
        )}
      </PageHeader>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Inventory list</h2>
            <p>
              Review variants, stock levels, thresholds, and reorder quantities.
              {monitoring.total !== null && (
                <> Showing {monitoring.monitored} of {monitoring.total}{plus} products in your store.</>
              )}
            </p>
          </div>
        </div>

        {notMonitored !== null && notMonitored > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" className={tab === "monitored" ? "primary" : "ghost"} onClick={() => setTab("monitored")}>
              Monitored ({monitoring.monitored})
            </button>
            <button type="button" className={tab === "unmonitored" ? "primary" : "ghost"} onClick={() => setTab("unmonitored")}>
              Not monitored ({unmonitored.products.length}{unmonitored.hasMore ? "+" : ""})
            </button>
          </div>
        )}

        {tab === "monitored" ? (
          <Form id="products-form" method="post">
            <ProductTable rows={rows} editable />
          </Form>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col"></th>
                </tr>
              </thead>
              <tbody>
                {unmonitored.products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.title}</td>
                    <td>
                      <a
                        className="ghost"
                        href={`https://${shop}/admin/products/${product.id.split("/").pop()}`}
                        target="_top"
                        rel="noreferrer"
                      >
                        Open in Shopify
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 16 }}>
              These products fall outside the {monitoring.monitored} most recently updated products this app
              currently tracks, so they don't have thresholds or alerts set up yet
              {unmonitored.hasMore ? " (and there may be even more beyond this list)" : ""}. Editing or updating a
              product in Shopify brings it back into the tracked window automatically.
            </p>
          </div>
        )}
      </section>
    </>
  );
}
