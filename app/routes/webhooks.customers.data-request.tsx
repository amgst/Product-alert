import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for shop: ${shop}`);

  // Mandatory GDPR data request webhook handler
  // Since Min Stock Notifier only stores shop-level inventory threshold settings
  // and notification emails/phones set by merchant, no end-customer PII is stored.

  return new Response();
};
