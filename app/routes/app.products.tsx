import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";
import { PageHeader, ProductTable } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { loadInventoryRows } from "../inventory";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  return { rows: await loadInventoryRows(admin, session.shop) };
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
  const { rows } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader eyebrow="Catalog thresholds" title="Products">
        <button className="ghost" type="submit" form="products-form">Save thresholds</button>
      </PageHeader>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Inventory list</h2>
            <p>Review variants, stock levels, thresholds, and reorder quantities.</p>
          </div>
        </div>
        <Form id="products-form" method="post">
          <ProductTable rows={rows} editable />
        </Form>
      </section>
    </>
  );
}
