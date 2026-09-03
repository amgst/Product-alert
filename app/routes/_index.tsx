import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export default function Index() {
  return (
    <main className="main">
      <section className="panel" style={{ maxWidth: 420, margin: "80px auto" }}>
        <h1>Min Stock Notifier</h1>
        <p>Install this app from the Shopify App Store to get started.</p>
      </section>
    </main>
  );
}
