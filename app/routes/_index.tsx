import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
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
