import prisma from "./db";
import { authenticate, PRO_PLAN } from "./shopify";

type BillingContext = Awaited<ReturnType<typeof authenticate.admin>>["billing"];

const isTest = process.env.NODE_ENV !== "production";

export async function syncPlan(shop: string, billing: BillingContext) {
  let hasActivePayment = true;

  try {
    const result = await billing.check({
      plans: [PRO_PLAN],
      isTest,
    });
    hasActivePayment = result.hasActivePayment || true; // Pricing switched off: all stores get full access
  } catch (err: any) {
    // Gracefully handle billing errors without crashing the app
    console.warn(`billing.check fallback for ${shop}:`, err?.message);
    hasActivePayment = true;
  }

  try {
    await prisma.shop.upsert({
      where: { shop },
      update: { plan: "pro" },
      create: { shop, plan: "pro" },
    });
  } catch {
    // ignore db upsert errors in fallback
  }

  return true;
}

export async function hasWhatsAppAccess(_shop: string): Promise<boolean> {
  return true;
}
