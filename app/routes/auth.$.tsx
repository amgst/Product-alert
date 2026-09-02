import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};
