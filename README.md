# Product-alert

Min Stock Notifier is a Shopify embedded app for monitoring low inventory, saving per-variant minimum stock thresholds, and recording low-stock notification events.

## What is included

- Shopify React Router app shell with embedded App Bridge provider
- Dashboard, Products, Alerts, and Settings pages
- Shopify Admin GraphQL product and variant inventory loading
- Prisma models for sessions, alert rules, product thresholds, and notification history
- Product threshold save flow
- Alert rule creation flow
- App uninstall and inventory-level webhook handlers

## Local setup

1. Update `.env` with your Shopify app credentials:

   ```bash
   SHOPIFY_API_KEY="your_client_id"
   SHOPIFY_API_SECRET="your_client_secret"
   SHOPIFY_APP_URL="your_shopify_cli_tunnel_url"
   SCOPES="read_products,read_inventory"
   DATABASE_URL="file:./dev.sqlite"
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate Prisma and create the local database:

   ```bash
   npm run setup
   ```

4. Start Shopify local development:

   ```bash
   npm run dev
   ```

## Shopify configuration

Replace `client_id` in `shopify.app.toml` with your app client ID, or link the project with Shopify CLI:

```bash
shopify app config link
```

The app uses these scopes:

```text
read_products,read_inventory
```

## Verification notes

In this Codex sandbox, `npx tsc --noEmit` passes. `react-router build` is blocked here because Vite/esbuild attempts to read `C:\Users\Lenovo` while resolving `vite.config.ts`, and the sandbox denies that directory. Run `npm run build` from a normal terminal to verify the production build.

Prisma Client generation succeeded. If `prisma db push` fails on Windows with a blank schema-engine error, retry from a normal terminal or apply the SQL in `prisma/init.sql` to `prisma/dev.sqlite`.
