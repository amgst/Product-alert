import type { LoaderFunctionArgs } from "react-router";
import { Form, redirect, useLoaderData } from "react-router";
import { login } from "../shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return login(request);
};

export default function Index() {
  const loginError = useLoaderData<typeof loader>() as { shop?: string } | undefined;

  return (
    <main className="main">
      <section className="panel" style={{ maxWidth: 420, margin: "80px auto" }}>
        <h1>Min Stock Notifier</h1>
        <p>Enter your shop domain to log in.</p>
        <Form method="get" className="rule-form" style={{ marginTop: 16 }}>
          <label>
            Shop domain
            <input type="text" name="shop" placeholder="my-shop-domain.myshopify.com" />
          </label>
          {loginError?.shop && <p style={{ color: "var(--danger)" }}>{loginError.shop}</p>}
          <button type="submit" className="primary full">
            Log in
          </button>
        </Form>
      </section>
    </main>
  );
}
