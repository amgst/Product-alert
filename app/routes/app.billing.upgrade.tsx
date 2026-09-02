import type { LoaderFunctionArgs } from "react-router";
import { authenticate, PRO_PLAN } from "../shopify";

const isTest = process.env.NODE_ENV !== "production";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  return billing.request({
    plan: PRO_PLAN,
    isTest,
    returnUrl: `${process.env.SHOPIFY_APP_URL}/app/settings`,
  });
};
