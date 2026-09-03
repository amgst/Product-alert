import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for shop: ${shop}`);

  // Mandatory GDPR customer redaction webhook handler
  // Min Stock Notifier stores no end-customer Personal Identifiable Information (PII).

  return new Response();
};
