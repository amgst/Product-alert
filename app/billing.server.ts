import prisma from "./db";
import { authenticate, PRO_PLAN } from "./shopify";

type BillingContext = Awaited<ReturnType<typeof authenticate.admin>>["billing"];

const isTest = process.env.NODE_ENV !== "production";

export async function syncPlan(shop: string, billing: BillingContext) {
  let hasActivePayment = false;

  try {
    const result = await billing.check({
      plans: [PRO_PLAN as any],
      isTest,
    });
    hasActivePayment = result.hasActivePayment;
  } catch (err: any) {
    // Billing check failed (e.g. transient API error) — don't let it crash the
    // page, but don't silently grant paid access either; fall back to whatever
    // plan is already on record for this shop.
    console.warn(`billing.check fallback for ${shop}:`, err?.message);
    const existing = await prisma.shop.findUnique({ where: { shop } }).catch(() => null);
    return existing?.plan === "pro";
  }

  try {
    await prisma.shop.upsert({
      where: { shop },
      update: { plan: hasActivePayment ? "pro" : "free" },
      create: { shop, plan: hasActivePayment ? "pro" : "free" },
    });
  } catch {
    // ignore db upsert errors in fallback
  }

  return hasActivePayment;
}

export async function hasWhatsAppAccess(shop: string): Promise<boolean> {
  const record = await prisma.shop.findUnique({ where: { shop } }).catch(() => null);
  return record?.plan === "pro";
}
