import { Link, Outlet, useLocation, useNavigation } from "react-router";

const navItems = [
  { label: "Dashboard", to: "/app", icon: "grid" },
  { label: "Products", to: "/app/products", icon: "box" },
  { label: "Alerts", to: "/app/alerts", icon: "bell" },
  { label: "Settings", to: "/app/settings", icon: "gear" },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    grid: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-11h6V4h-6v5Z",
    box: "M4 6h16v4H4V6Zm0 8h16v4H4v-4Z",
    bell: "M12 22a2.4 2.4 0 0 0 2.3-1.7H9.7A2.4 2.4 0 0 0 12 22Zm7-6v-5.4A7 7 0 0 0 13 3.1V2h-2v1.1a7 7 0 0 0-6 7.5V16l-2 2v1h18v-1l-2-2Z",
    gear: "M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2h-4l-.4 3a7.7 7.7 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5 2.4-1a7.7 7.7 0 0 0 2.6 1.5l.4 3h4l.4-3a7.7 7.7 0 0 0 2.6-1.5l2.4 1 2-3.5-2-1.5ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
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
