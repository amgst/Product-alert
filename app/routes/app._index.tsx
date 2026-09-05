import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { PageHeader, ProductTable } from "../components";
import { getStatus } from "../inventory.shared";
import type { ProductRow } from "../inventory.shared";
import { authenticate } from "../shopify";
import prisma from "../db";
import { ensureDefaultRule, getStoreProductCount, loadInventoryRows } from "../inventory";
import type { NotificationEvent } from "@prisma/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  // ensureDefaultRule runs first: it lazily creates a shop's first AlertRule row,
  // and activeRules below must count that row on this very load, not just the next one.
  const rule = await ensureDefaultRule(shop);
  const [{ rows }, productCount, events, activeRules, alertsSent] = await Promise.all([
    loadInventoryRows(admin, shop),
    getStoreProductCount(admin, shop),
    prisma.notificationEvent.findMany({ where: { shop }, orderBy: { sentAt: "desc" }, take: 5 }),
    prisma.alertRule.count({ where: { shop, active: true } }),
    prisma.notificationEvent.count({ where: { shop } }),
  ]);

  const monitoredProductCount = new Set(rows.map((row: ProductRow) => row.productId)).size;

  return {
    rows,
    rule,
    events,
    monitoring: {
      monitored: monitoredProductCount,
      total: productCount?.count ?? null,
      isExact: productCount?.isExact ?? true,
    },
    counts: {
      belowMinimum: rows.filter((row: ProductRow) => getStatus(row).tone === "danger").length,
      nearThreshold: rows.filter((row: ProductRow) => getStatus(row).tone === "warning").length,
      activeRules,
      alertsSent,
    },
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const rule = await ensureDefaultRule(session.shop);

  await prisma.alertRule.update({
    where: { id: rule.id },
    data: {
      triggerType: String(formData.get("triggerType") || "at_or_below_minimum"),
      checkFrequency: String(formData.get("checkFrequency") || "hourly"),
    },
  });

  return { ok: true };
};

export default function Dashboard() {
  const { rows, rule, counts, events, monitoring } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ ok?: boolean }>();
  const notMonitored = monitoring.total !== null ? Math.max(0, monitoring.total - monitoring.monitored) : null;
  const plus = monitoring.isExact ? "" : "+";

  return (
    <>
      <PageHeader eyebrow="Inventory monitoring" title="Low stock alerts">
        <Link className="ghost" to="/app/alerts">Add rule</Link>
        <Link className="primary" to="/app/products">Edit thresholds</Link>
      </PageHeader>

      <section className="summary-grid" aria-label="Inventory summary">
        <article className="metric danger"><span>Below minimum</span><strong>{counts.belowMinimum}</strong><small>Needs reorder now</small></article>
        <article className="metric warning"><span>Near threshold</span><strong>{counts.nearThreshold}</strong><small>Likely low soon</small></article>
        <article className="metric"><span>Active rules</span><strong>{counts.activeRules}</strong><small>Store alert rules</small></article>
        <article className="metric"><span>Alerts sent</span><strong>{counts.alertsSent}</strong><small>All time</small></article>
      </section>

      <section className="workspace">
        <div className="panel inventory-panel">
          <div className="panel-header">
            <div>
              <h2>Products to watch</h2>
              <p>
                Live Shopify products matched with saved thresholds.
                {monitoring.total !== null && (
                  <> Monitoring {monitoring.monitored} of {monitoring.total}{plus} products in your store.</>
                )}
              </p>
            </div>
            {notMonitored !== null && notMonitored > 0 && (
              <span className="pill warning">{notMonitored}{plus} not monitored yet</span>
            )}
          </div>
          <ProductTable rows={rows.slice(0, 8)} />
        </div>

        <aside className="panel rules-panel">
          <div className="panel-header compact">
            <div>
              <h2>Alert rule</h2>
              <p>Default store-wide notification.</p>
            </div>
          </div>
          <fetcher.Form method="post" className="rule-form">
            <label>
              Trigger when stock is
              <select name="triggerType" defaultValue={rule.triggerType}>
                <option value="at_or_below_minimum">At or below minimum</option>
                <option value="below_minimum">Below minimum only</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </label>
            <label>
              Check inventory every
              <select name="checkFrequency" defaultValue={rule.checkFrequency}>
                <option value="hourly">1 hour</option>
                <option value="three_hours">3 hours</option>
                <option value="daily">24 hours</option>
              </select>
            </label>
            <fieldset>
              <legend>Send notifications to</legend>
              <label className="check"><input type="checkbox" defaultChecked /> Store owner email</label>
              <label className="check"><input type="checkbox" defaultChecked /> Staff emails</label>
              <label className="check disabled"><input type="checkbox" disabled /> Slack channel <span className="badge">Coming soon</span></label>
            </fieldset>
            <button className="primary full" type="submit" disabled={fetcher.state !== "idle"}>
              {fetcher.state !== "idle" ? "Updating…" : "Update rule"}
            </button>
            {fetcher.data?.ok && <p style={{ color: "var(--ok)", margin: 0 }}>Rule updated.</p>}
          </fetcher.Form>
        </aside>
      </section>

      <section className="activity">
        <div className="panel-header">
          <div>
            <h2>Recent notifications</h2>
            <p>Messages generated from low-stock events.</p>
          </div>
        </div>
        <ol className="timeline">
          {events.length === 0 ? (
            <li><span className="dot ok" /><div><strong>No notifications yet</strong><small>Low-stock events will appear here.</small></div></li>
          ) : (
            events.map((event: NotificationEvent) => (
              <li key={event.id}>
                <span className={`dot ${event.level}`} />
                <div><strong>{event.title}</strong><small>{event.message}</small></div>
              </li>
            ))
          )}
        </ol>
      </section>
    </>
  );
}
