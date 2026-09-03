import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
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

  if (isRouteErrorResponse(error)) {
    if (error.status === 404 || error.status >= 500) {
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

    try {
      const shopifyResult = boundary.error(error);
      if (shopifyResult) return shopifyResult;
    } catch {
      // Fall through to ErrorDisplay if boundary handling fails
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


