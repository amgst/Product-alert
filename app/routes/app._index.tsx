import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { PageHeader, ProductTable } from "../components";
import { getStatus } from "../inventory.shared";
import { authenticate } from "../shopify";
import prisma from "../db";
import { ensureDefaultRule, loadInventoryRows } from "../inventory";
import type { NotificationEvent } from "@prisma/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const rows = await loadInventoryRows(admin, session.shop);
  const rule = await ensureDefaultRule(session.shop);
  const events = await prisma.notificationEvent.findMany({
    where: { shop: session.shop },
    orderBy: { sentAt: "desc" },
    take: 5,
  });

  return {
    rows,
    rule,
    events,
    counts: {
      belowMinimum: rows.filter((row) => getStatus(row).tone === "danger").length,
      nearThreshold: rows.filter((row) => getStatus(row).tone === "warning").length,
      activeRules: await prisma.alertRule.count({ where: { shop: session.shop, active: true } }),
      alertsSent: await prisma.notificationEvent.count({ where: { shop: session.shop } }),
    },
  };
};

export default function Dashboard() {
  const { rows, counts, events } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader eyebrow="Inventory monitoring" title="Low stock alerts">
        <a className="ghost" href="/app/alerts">Add rule</a>
        <a className="primary" href="/app/products">Edit thresholds</a>
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
              <p>Live Shopify products matched with saved thresholds.</p>
            </div>
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
          <div className="rule-form">
            <label>Trigger when stock is<select defaultValue="at_or_below_minimum"><option value="at_or_below_minimum">At or below minimum</option><option value="below_minimum">Below minimum only</option></select></label>
            <label>Check inventory every<select defaultValue="hourly"><option value="hourly">1 hour</option><option value="three_hours">3 hours</option><option value="daily">24 hours</option></select></label>
            <fieldset>
              <legend>Send notifications to</legend>
              <label className="check"><input type="checkbox" defaultChecked /> Store owner email</label>
              <label className="check"><input type="checkbox" defaultChecked /> Staff emails</label>
              <label className="check"><input type="checkbox" /> Slack channel</label>
            </fieldset>
          </div>
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
