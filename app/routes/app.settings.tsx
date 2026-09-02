import type { LoaderFunctionArgs } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Settings() {
  return (
    <>
      <PageHeader eyebrow="App configuration" title="Settings">
        <button className="primary" type="submit" form="settings-form">Save settings</button>
      </PageHeader>

      <section className="settings-grid">
        <div className="panel">
          <div className="panel-header compact">
            <div>
              <h2>Notification channels</h2>
              <p>Choose where alerts should be delivered.</p>
            </div>
          </div>
          <form className="rule-form" id="settings-form">
            <label>Email sender name<input type="text" defaultValue="MinStock Notifier" /></label>
            <label>Default recipients<input type="text" defaultValue="ops@example.com, buyer@example.com" /></label>
            <label className="check"><input type="checkbox" defaultChecked /> Send one daily low-stock summary</label>
            <label className="check"><input type="checkbox" /> Send recovery notifications</label>
            <label className="check"><input type="checkbox" /> Connect Slack for urgent alerts</label>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header compact">
            <div>
              <h2>Inventory sync</h2>
              <p>Control how often Shopify inventory is checked.</p>
            </div>
          </div>
          <form className="rule-form">
            <label>Sync schedule<select defaultValue="hourly"><option value="hourly">Every hour</option><option value="three_hours">Every 3 hours</option><option value="daily">Every 24 hours</option></select></label>
            <label>Timezone<select defaultValue="store"><option value="store">Store timezone</option><option value="utc">UTC</option></select></label>
            <label>Ignore products tagged<input type="text" defaultValue="preorder, dropship, discontinued" /></label>
            <label className="check"><input type="checkbox" defaultChecked /> Include committed inventory in warning emails</label>
          </form>
        </div>

        <div className="panel plan-panel">
          <div>
            <h2>Current plan</h2>
            <p>Starter plan monitors up to 500 products with hourly checks.</p>
          </div>
          <div className="price">$9<span>/month</span></div>
          <button className="ghost full" type="button">Manage billing</button>
        </div>
      </section>
    </>
  );
}
