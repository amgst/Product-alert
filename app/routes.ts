import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("debug", "routes/debug.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.tsx"),
  route("webhooks/inventory-levels-update", "routes/webhooks.inventory-levels-update.tsx"),
  route("webhooks/customers/data-request", "routes/webhooks.customers.data-request.tsx"),
  route("webhooks/customers/redact", "routes/webhooks.customers.redact.tsx"),
  route("webhooks/shop/redact", "routes/webhooks.shop.redact.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("products", "routes/app.products.tsx"),
    route("toggle-watch", "routes/app.toggle-watch.tsx"),
    route("alerts", "routes/app.alerts.tsx"),
    route("settings", "routes/app.settings.tsx"),
    route("billing/upgrade", "routes/app.billing.upgrade.tsx"),
    route("debug", "routes/app.debug.tsx"),
  ]),
  index("routes/_index.tsx"),
] satisfies RouteConfig;
