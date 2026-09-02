import prisma from "./db";
import { authenticate, PRO_PLAN } from "./shopify";

type BillingContext = Awaited<ReturnType<typeof authenticate.admin>>["billing"];

const isTest = process.env.NODE_ENV !== "production";

export async function syncPlan(shop: string, billing: BillingContext) {
  const { hasActivePayment, appSubscriptions } = await billing.check({
    plans: [PRO_PLAN],
    isTest,
  });

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
