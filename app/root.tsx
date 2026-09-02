import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "react-router";
import type { LinksFunction } from "react-router";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import stylesheet from "./styles/app.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }];

export const loader = async () => {
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <AppProvider apiKey={apiKey}>
          <Outlet />
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Something went wrong.";

  return (
    <html lang="en">
      <head>
        <title>MinStock Notifier error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <main className="main">
          <section className="panel">
            <h1>Unable to load app</h1>
            <p>{message}</p>
          </section>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
