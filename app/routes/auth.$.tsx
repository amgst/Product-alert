import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const shop = session?.shop || url.searchParams.get("shop");
  const host = url.searchParams.get("host");

  const params = new URLSearchParams();
  if (shop) params.set("shop", shop);
  if (host) params.set("host", host);

  const queryString = params.toString();
  return redirect(queryString ? `/app?${queryString}` : "/app");
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default function AuthPage() {
  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", textAlign: "center" }}>
      <p>Authenticating store with Shopify Admin...</p>
    </div>
  );
}
