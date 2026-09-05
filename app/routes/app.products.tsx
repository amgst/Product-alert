import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useLoaderData } from "react-router";
import { PageHeader, ProductTable } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { getStoreProductCount, listAllProductSummaries, loadInventoryRows } from "../inventory";
import type { ProductRow } from "../inventory.shared";

// history[i] is the cursor needed to fetch page (i + 2) - page 1 needs no cursor.
// Reconstructed from the URL on every request since loaders are stateless; each
// Next click appends one cursor, so jumping back to any page already visited is
// instant, while jumping forward still means paging through one page at a time -
// that's a Shopify API constraint (cursor-only), not a shortcut we're taking.
function parseHistory(param: string | null): string[] {
  if (!param) return [];
  try {
    const parsed = JSON.parse(param);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  let page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  let history = parseHistory(url.searchParams.get("h")).slice(0, page - 1);
  // A hand-edited or stale URL might claim a page it doesn't have the cursor for -
  // fall back to page 1 rather than silently fetching the wrong page's data.
  if (page > 1 && !history[page - 2]) {
    page = 1;
    history = [];
  }
  const after = page > 1 ? history[page - 2] : undefined;

  const [{ rows, pageInfo }, productCount, allSummaries] = await Promise.all([
    loadInventoryRows(admin, session.shop, after ? { after } : undefined),
    getStoreProductCount(admin, session.shop),
    listAllProductSummaries(admin, session.shop),
  ]);
  const monitoredIds = new Set(rows.map((row: ProductRow) => row.productId));

  return {
    rows,
    pageInfo,
    page,
    history,
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

function pageHref(targetPage: number, targetHistory: string[]) {
  const params = new URLSearchParams();
  params.set("page", String(targetPage));
  if (targetHistory.length) params.set("h", JSON.stringify(targetHistory));
  return `?${params.toString()}`;
}

export default function Products() {
  const { rows, pageInfo, page, history, shop, monitoring, unmonitored } = useLoaderData<typeof loader>();
  const notMonitored = monitoring.total !== null ? Math.max(0, monitoring.total - monitoring.monitored) : null;
  const plus = monitoring.isExact ? "" : "+";
  const totalPages = monitoring.total !== null ? Math.max(1, Math.ceil(monitoring.total / 25)) : null;
  const [tab, setTab] = useState<"monitored" | "unmonitored">("monitored");

  // Pages 1..page are already known (we've paged through them to get here); page+1
  // becomes reachable the moment this page's endCursor is known.
  const reachablePages = pageInfo.hasNextPage ? page + 1 : page;
  const nextHistory = pageInfo.endCursor ? [...history, pageInfo.endCursor] : history;

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
                <> Showing {monitoring.monitored} of {monitoring.total}{plus} products in your store — use Next/Previous to page through the rest.</>
              )}
            </p>
          </div>
        </div>

        {notMonitored !== null && notMonitored > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button type="button" className={tab === "monitored" ? "primary" : "ghost"} onClick={() => setTab("monitored")}>
              With inventory control ({monitoring.monitored})
            </button>
            <button type="button" className={tab === "unmonitored" ? "primary" : "ghost"} onClick={() => setTab("unmonitored")}>
              Without inventory control ({unmonitored.products.length}{unmonitored.hasMore ? "+" : ""})
            </button>
          </div>
        )}

        {tab === "monitored" ? (
          <>
            <Form id="products-form" method="post">
              <ProductTable rows={rows} editable />
            </Form>
            <nav style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, flexWrap: "wrap" }} aria-label="Product pages">
              {page > 1 && (
                <Link className="ghost" to={pageHref(page - 1, history.slice(0, page - 2))}>
                  ← Prev
                </Link>
              )}
              {Array.from({ length: reachablePages }, (_, i) => i + 1).map((num) => (
                <Link
                  key={num}
                  className={num === page ? "primary" : "ghost"}
                  aria-current={num === page ? "page" : undefined}
                  to={pageHref(num, num <= page ? history.slice(0, num - 1) : nextHistory)}
                >
                  {num}
                </Link>
              ))}
              {pageInfo.hasNextPage && (
                <Link className="ghost" to={pageHref(page + 1, nextHistory)}>
                  Next →
                </Link>
              )}
              {totalPages !== null && (
                <span style={{ marginLeft: 8, fontSize: 13, color: "var(--muted)" }}>
                  Page {page} of {totalPages}{plus}
                </span>
              )}
            </nav>
          </>
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
