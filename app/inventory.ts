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

const PRODUCTS_QUERY = `
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
`;

// Shopify is retiring permanent (non-expiring) offline access tokens. A shop that
// installed this app before that rollout still holds one, and every Admin API call
// with it fails with a 403 "Non-expiring access tokens are no longer accepted".
// Shopify's documented fix is a one-time silent token-exchange migration, not a
// merchant reinstall, so we self-heal instead of just bouncing the user to re-auth.
// https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/offline-access-tokens#expiring-vs-non-expiring-offline-tokens
async function migrateNonExpiringToken(shop: string, nonExpiringAccessToken: string) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: nonExpiringAccessToken,
      subject_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
      expiring: "1",
    }),
  });

  if (!res.ok) return null;
  return (await res.json()) as { access_token: string; scope: string; expires_in?: number };
}

async function tryHealNonExpiringToken(
  shop: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ response: Response } | null> {
  try {
    const session = await prisma.session.findFirst({ where: { shop, isOnline: false } });
    if (!session?.accessToken) return null;

    const migrated = await migrateNonExpiringToken(shop, session.accessToken);
    if (!migrated?.access_token) return null;

    await prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: migrated.access_token,
        scope: migrated.scope,
        expires: migrated.expires_in ? new Date(Date.now() + migrated.expires_in * 1000) : null,
      },
    });

    const response = await fetch(`https://${shop}/admin/api/2025-07/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": migrated.access_token },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });
    if (!response.ok) return null;
    return { response };
  } catch {
    return null;
  }
}

// Every admin.graphql() call in this app must go through here, not admin.graphql()
// directly — this is the one place the non-expiring-token self-heal (above) is
// wired in. A call site that bypasses this loses that protection silently, so any
// new Admin API call should be added through this helper.
export async function fetchAdminGraphql(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<Response> {
  let response: Response;
  try {
    response = await admin.graphql(query, variables ? { variables } : undefined);
  } catch (err: any) {
    const isForbidden = err?.errors?.networkStatusCode === 403 || err?.message?.includes("Forbidden");
    if (!isForbidden) throw err;
    const healed = await tryHealNonExpiringToken(shop, query, variables);
    if (healed) return healed.response;
    throw err;
  }

  if (response.status === 403 || response.status === 401) {
    const healed = await tryHealNonExpiringToken(shop, query, variables);
    if (healed) return healed.response;
  }

  return response;
}

export async function loadInventoryRows(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
) {
  let response: Response;
  let thresholds: ProductThreshold[];

  try {
    [response, thresholds] = await Promise.all([
      fetchAdminGraphql(admin, shop, PRODUCTS_QUERY),
      prisma.productThreshold.findMany({ where: { shop } }) as Promise<ProductThreshold[]>,
    ]);
  } catch (err: any) {
    const isForbidden = err?.errors?.networkStatusCode === 403 || err?.message?.includes("Forbidden");
    if (!isForbidden) throw err;

    try {
      await prisma.session.deleteMany({ where: { shop } });
    } catch {
      // ignore
    }
    const body = err?.response?.body ?? err?.errors?.body ?? err?.body;
    throw new Response(
      `Shopify GraphQL products query returned 403 Forbidden.\n\nRaw error: ${err?.message}\n\nResponse body: ${typeof body === "string" ? body : JSON.stringify(body)}`,
      { status: 403, statusText: "Forbidden" },
    );
  }

  if (response.status === 403 || response.status === 401) {
    const bodyText = await response.text().catch(() => "<could not read response body>");
    throw new Response(
      `Shopify Admin API returned ${response.status} ${response.statusText || "Forbidden"} for the products query.\n\nResponse body: ${bodyText}`,
      { status: response.status, statusText: response.statusText || "Forbidden" },
    );
  }

  const payload = (await response.json()) as { data?: { products?: { nodes?: ShopifyProduct[] } }; errors?: Array<{ message: string }> };
  const products = payload?.data?.products?.nodes ?? [];
  const thresholdMap = new Map(
    thresholds.map((item) => [`${item.productId}:${item.variantId ?? ""}`, item] as const),
  );

  return products.flatMap((product) =>
    (product.variants?.nodes ?? []).map((variant) => {
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
      recipients: "",
      defaultMinimum: 15,
    },
  });
}
