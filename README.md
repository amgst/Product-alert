# Product-alert

Min Stock Notifier is a Shopify embedded app for monitoring low inventory, saving per-variant minimum stock thresholds, and recording low-stock notification events. The app uses Prisma with Prisma Postgres/PostgreSQL.

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

3. Create a Supabase project, then set `DATABASE_URL` and `DIRECT_URL` in `.env`:

   ```bash
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.ncchfjcpjtwpfomayzwu.supabase.co:5432/postgres?schema=public"
   DIRECT_URL="postgresql://postgres:[YOUR-PASSWORD]@db.ncchfjcpjtwpfomayzwu.supabase.co:5432/postgres?schema=public"
   ```

   Replace `[YOUR-PASSWORD]` with the database password from Supabase project settings.

   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
   ```

4. Generate Prisma and push the schema:

   ```bash
   npm run setup
   ```

5. Start Shopify local development:

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

Prisma Client generation succeeded in this sandbox. `prisma db push` requires real Supabase `DATABASE_URL` and `DIRECT_URL` values; the placeholder password in `.env` must be replaced before setup can create tables.
