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
  const indexes = [...formData.keys()]
    .filter((key) => key.startsWith("productId:"))
    .map((key) => key.split(":")[1]);

  await Promise.all(
    indexes.map((index) => {
      const productId = String(formData.get(`productId:${index}`));
      const variantId = String(formData.get(`variantId:${index}`));

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
          minimumStock: Number(formData.get(`minimumStock:${index}`) || 0),
          reorderQuantity: Number(formData.get(`reorderQuantity:${index}`) || 0),
          watchEnabled: formData.has(`watchEnabled:${index}`),
        },
        create: {
          shop: session.shop,
          productId,
          variantId,
          sku: String(formData.get(`sku:${index}`) || ""),
          productTitle: String(formData.get(`productTitle:${index}`) || ""),
          variantTitle: String(formData.get(`variantTitle:${index}`) || ""),
          minimumStock: Number(formData.get(`minimumStock:${index}`) || 0),
          reorderQuantity: Number(formData.get(`reorderQuantity:${index}`) || 0),
          watchEnabled: formData.has(`watchEnabled:${index}`),
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
