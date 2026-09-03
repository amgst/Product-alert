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
import { boundary } from "@shopify/shopify-app-react-router/server";
import stylesheet from "./styles/app.css?url";
import { ErrorDisplay } from "./components/ErrorDisplay";

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

  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof (error as { data?: unknown }).data === "string" &&
    ((error as { data: string }).data.includes("<script") ||
      (error as { data: string }).data.includes("shopify-reload") ||
      (error as { data: string }).data.includes("window.top"))
  ) {
    try {
      const shopifyResult = boundary.error(error);
      if (shopifyResult) return shopifyResult;
    } catch {
      // Fall through to ErrorDisplay if boundary rendering fails
    }
  }

  return (
    <html lang="en">
      <head>
        <title>MinStock Notifier - Error</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ErrorDisplay error={error} isRoot />
        <Scripts />
      </body>
    </html>
  );
}

