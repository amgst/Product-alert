import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, Outlet, isRouteErrorResponse, useLocation, useNavigation, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify";
import { ErrorDisplay } from "../components/ErrorDisplay";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // If response data is Shopify App Bridge bounce HTML, execute it directly to redirect for re-auth
    if (typeof error.data === "string" && (error.data.includes("app-bridge.js") || error.data.includes("shopifycloud"))) {
      return (
        <div
          dangerouslySetInnerHTML={{ __html: error.data }}
          ref={(node) => {
            if (node) {
              const scripts = node.querySelectorAll("script");
              scripts.forEach((oldScript) => {
                const newScript = document.createElement("script");
                Array.from(oldScript.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode?.replaceChild(newScript, oldScript);
              });
            }
          }}
        />
      );
    }

    try {
      const shopifyResult = boundary.error(error);
      if (shopifyResult) return shopifyResult;
    } catch {
      // Fall through to ErrorDisplay if boundary handling fails
    }
  }

  return <ErrorDisplay error={error} />;
}



const navItems = [
  { label: "Dashboard", to: "/app", icon: "grid" },
  { label: "Products", to: "/app/products", icon: "box" },
  { label: "Alerts", to: "/app/alerts", icon: "bell" },
  { label: "Settings", to: "/app/settings", icon: "gear" },
  { label: "Debugger", to: "/app/debug", icon: "bug" },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z",
    box: "M4 6h16v4H4V6Zm0 8h16v4H4v-4Z",
    bell: "M12 22a2.4 2.4 0 0 0 2.3-1.7H9.7A2.4 2.4 0 0 0 12 22Zm7-6v-5.4A7 7 0 0 0 13 3.1V2h-2v1.1a7 7 0 0 0-6 7.5V16l-2 2v1h18v-1l-2-2Z",
    gear: "M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2h-4l-.4 3a7.7 7.7 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 2.6 1.5l.4 3h4l.4-3a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
    bug: "M19 13h-2.11c-.14-.72-.41-1.39-.79-2h2.9a1 1 0 1 0 0-2h-3.79A5.992 5.992 0 0 0 13 6.18V4h2a1 1 0 1 0 0-2h-6a1 1 0 1 0 0 2h2v2.18A5.992 5.992 0 0 0 8.79 9H5a1 1 0 1 0 0 2h2.9c-.38.61-.65 1.28-.79 2H5a1 1 0 1 0 0 2h2.11c.14.72.41 1.39.79 2H5a1 1 0 1 0 0 2h3.79c.67.58 1.45 1.02 2.31 1.28V22h1v-1.72c.86-.26 1.64-.7 2.31-1.28H19a1 1 0 1 0 0-2h-2.9c.38-.61.65-1.28.79-2H19a1 1 0 1 0 0-2z",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export default function AppShell() {
  const location = useLocation();
  const navigation = useNavigation();
  const isLoading = navigation.state !== "idle";

  return (
    <div className="shell">
      <div className={`route-progress ${isLoading ? "active" : ""}`} aria-hidden="true" />
      <aside className="sidebar" aria-label="App navigation">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6.5 20.5h11l1.2-12.6H5.3L6.5 20.5Z" />
              <path d="M9 7.9a3 3 0 0 1 6 0" />
            </svg>
          </div>
          <div>
            <strong>MinStock</strong>
            <span>Notifier</span>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const active =
              item.to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(item.to);

            return (
              <Link className={active ? "active" : ""} key={item.to} to={item.to}>
                <span className="icon">
                  <Icon name={item.icon} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="store-card">
          <span>Connected store</span>
          <strong>Shopify Admin</strong>
          <small>Live inventory sync</small>
        </div>
      </aside>

      <main className="main">
        {isLoading && (
          <div className="route-loading-overlay" role="status" aria-live="polite">
            <span className="spinner" />
            <span>Loading…</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
