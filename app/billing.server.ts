import prisma from "./db";
import { authenticate, PRO_PLAN } from "./shopify";

type BillingContext = Awaited<ReturnType<typeof authenticate.admin>>["billing"];

const isTest = process.env.NODE_ENV !== "production";

export async function syncPlan(shop: string, billing: BillingContext) {
  let hasActivePayment: boolean;
  let appSubscriptions: Array<{ id: string }>;

  try {
    ({ hasActivePayment, appSubscriptions } = await billing.check({
      plans: [PRO_PLAN],
      isTest,
    }));
  } catch (err: any) {
    const body = err?.response?.body ?? err?.errors?.body ?? err?.body;
    throw new Response(
      `billing.check() failed for ${shop}.\n\nRaw error: ${err?.message}\n\nnetworkStatusCode: ${err?.errors?.networkStatusCode ?? err?.networkStatusCode}\n\nResponse body: ${typeof body === "string" ? body : JSON.stringify(body)}`,
      { status: err?.errors?.networkStatusCode ?? 500, statusText: "Billing Check Failed" },
    );
  }

  await prisma.shop.upsert({
    where: { shop },
    update: {
      plan: hasActivePayment ? "pro" : "free",
      subscriptionId: hasActivePayment ? appSubscriptions[0]?.id ?? null : null,
    },
    create: {
      shop,
      plan: hasActivePayment ? "pro" : "free",
      subscriptionId: hasActivePayment ? appSubscriptions[0]?.id ?? null : null,
    },
  });

  return hasActivePayment;
}

export async function hasWhatsAppAccess(shop: string): Promise<boolean> {
  const record = await prisma.shop.findUnique({ where: { shop } });
  return record?.plan === "pro";
}
