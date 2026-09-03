import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate, PRO_PLAN } from "../shopify";

const isTest = process.env.NODE_ENV !== "production";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, session } = await authenticate.admin(request);

  try {
    return await billing.request({
      plan: PRO_PLAN as any,
      isTest,
      returnUrl: `${process.env.SHOPIFY_APP_URL}/app/settings`,
    });
  } catch (error) {
    if (error instanceof Response) throw error;

    console.error(`Billing request failed for ${session.shop}`, error);
    const message =
      "We couldn't start the upgrade. This usually happens on development stores, which can't be charged — install the app on a live store, or a Partner development store with a test charge enabled, to try billing.";
    return redirect(`/app/settings?billingError=${encodeURIComponent(message)}`);
  }
};
