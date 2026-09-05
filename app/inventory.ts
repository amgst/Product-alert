import prisma from "./db";
import type { ProductThreshold } from "@prisma/client";
import type { ProductRow } from "./inventory.shared";

type ShopifyVariant = {
  id: string;
  title: string;
  sku: string | null;
  inventoryQuantity: number | null;
  image: { url: string } | null;
};

type ShopifyProduct = {
  id: string;
  title: string;
  featuredImage: { url: string } | null;
  variants: {
    nodes: ShopifyVariant[];
  };
};

const PRODUCTS_QUERY = `
  #graphql
  query MinStockProducts($first: Int, $after: String, $last: Int, $before: String) {
    products(first: $first, after: $after, last: $last, before: $before, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        featuredImage {
          url
        }
        variants(first: 20) {
          nodes {
            id
            title
            sku
            inventoryQuantity
            image {
              url
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

const PRODUCTS_PAGE_SIZE = 25;

export type ProductsPageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

const PRODUCTS_COUNT_QUERY = `
  #graphql
  query MinStockProductsCount {
    productsCount {
      count
      precision
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
  pagination?: { after?: string; before?: string },
): Promise<{ rows: ProductRow[]; pageInfo: ProductsPageInfo }> {
  const variables = pagination?.before
    ? { last: PRODUCTS_PAGE_SIZE, before: pagination.before }
    : { first: PRODUCTS_PAGE_SIZE, after: pagination?.after };

  let response: Response;
  let thresholds: ProductThreshold[];

  try {
    [response, thresholds] = await Promise.all([
      fetchAdminGraphql(admin, shop, PRODUCTS_QUERY, variables),
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

  const payload = (await response.json()) as {
    data?: { products?: { nodes?: ShopifyProduct[]; pageInfo?: ProductsPageInfo } };
    errors?: Array<{ message: string }>;
  };
  const products = payload?.data?.products?.nodes ?? [];
  const pageInfo: ProductsPageInfo = payload?.data?.products?.pageInfo ?? {
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  };
  const thresholdMap = new Map(
    thresholds.map((item) => [`${item.productId}:${item.variantId ?? ""}`, item] as const),
  );

  const rows = products.flatMap((product) =>
    (product.variants?.nodes ?? []).map((variant) => {
      const saved = thresholdMap.get(`${product.id}:${variant.id}`);
      const available = variant.inventoryQuantity ?? 0;

      return {
        productId: product.id,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title,
        sku: variant.sku || "No SKU",
        imageUrl: variant.image?.url ?? product.featuredImage?.url ?? null,
        available,
        committed: 0,
        minimumStock: saved?.minimumStock ?? 15,
        reorderQuantity: saved?.reorderQuantity ?? 50,
        watchEnabled: saved?.watchEnabled ?? true,
      } satisfies ProductRow;
    }),
  );

  return { rows, pageInfo };
}


// The products query above only fetches the 25 most recently updated products, so
// stores with larger catalogs will have products that never appear in the app at
// all. This tells the UI the real total so it can surface that gap to the merchant
// instead of silently only ever showing a subset of their catalog.
export async function getStoreProductCount(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
): Promise<{ count: number; isExact: boolean } | null> {
  try {
    const response = await fetchAdminGraphql(admin, shop, PRODUCTS_COUNT_QUERY);
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: { productsCount?: { count: number; precision: string } };
    };
    const result = payload?.data?.productsCount;
    if (!result) return null;

    return { count: result.count, isExact: result.precision === "EXACT" };
  } catch {
    return null;
  }
}

const ALL_PRODUCT_TITLES_QUERY = `
  #graphql
  query MinStockAllProductTitles {
    products(first: 250, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`;

// Cheap (no variants/inventory) lookup of product id+title, used only to name the
// products that fall outside the 25-item monitored window above, so merchants can
// actually see which products aren't covered instead of just a count.
export async function listAllProductSummaries(
  admin: { graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response> },
  shop: string,
): Promise<{ products: { id: string; title: string }[]; hasMore: boolean } | null> {
  try {
    const response = await fetchAdminGraphql(admin, shop, ALL_PRODUCT_TITLES_QUERY);
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      data?: { products?: { nodes?: { id: string; title: string }[]; pageInfo?: { hasNextPage: boolean } } };
    };
    return {
      products: payload?.data?.products?.nodes ?? [],
      hasMore: payload?.data?.products?.pageInfo?.hasNextPage ?? false,
    };
  } catch {
    return null;
  }
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
