import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("debug", "routes/debug.tsx"),
  route("auth/*", "routes/auth.$.tsx"),
  route("webhooks/app/uninstalled", "routes/webhooks.app.uninstalled.tsx"),
  route("webhooks/inventory-levels-update", "routes/webhooks.inventory-levels-update.tsx"),
  route("app", "routes/app.tsx", [
    index("routes/app._index.tsx"),
    route("products", "routes/app.products.tsx"),
    route("alerts", "routes/app.alerts.tsx"),
    route("settings", "routes/app.settings.tsx"),
  ]),
  index("routes/_index.tsx"),
] satisfies RouteConfig;
