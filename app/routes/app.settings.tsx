import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";
import { sendEmailMessage, sendWhatsAppMessage } from "../notifications.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "test-email") {
    const to = String(formData.get("testEmail") || "").trim();
    if (!to) return { intent, ok: false, error: "Enter an email address." };

    const result = await sendEmailMessage(
      to,
      "Test: low stock alert",
      "<p>This is a test notification from MinStock Notifier.</p>",
    );
    return { intent, ...result };
  }

  if (intent === "test-whatsapp") {
    const to = String(formData.get("testWhatsapp") || "").trim();
    if (!to) return { intent, ok: false, error: "Enter a WhatsApp number in E.164 format." };

    const result = await sendWhatsAppMessage(to, "Test: low stock alert from MinStock Notifier.");
    return { intent, ...result };
  }

  return { intent, ok: false, error: "Unknown action." };
};

function TestEmailForm() {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" className="rule-form">
      <input type="hidden" name="intent" value="test-email" />
      <label>
        Send a test email to
        <input name="testEmail" type="email" placeholder="you@example.com" required />
      </label>
      <button className="ghost full" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send test email"}
      </button>
      {fetcher.data && (
        <p style={{ color: fetcher.data.ok ? "var(--ok)" : "var(--danger)" }}>
          {fetcher.data.ok ? "Sent — check the inbox." : fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

function TestWhatsAppForm() {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" className="rule-form">
      <input type="hidden" name="intent" value="test-whatsapp" />
      <label>
        Send a test WhatsApp message to
        <input name="testWhatsapp" type="text" placeholder="+14155551234" required />
      </label>
      <button className="ghost full" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send test WhatsApp"}
      </button>
      {fetcher.data && (
        <p style={{ color: fetcher.data.ok ? "var(--ok)" : "var(--danger)" }}>
          {fetcher.data.ok ? "Sent — check WhatsApp." : fetcher.data.error}
        </p>
      )}
    </fetcher.Form>
  );
}

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
              <h2>Test notifications</h2>
              <p>Send yourself a test message to confirm email and WhatsApp are wired up.</p>
            </div>
          </div>
          <TestEmailForm />
          <div style={{ height: 16 }} />
          <TestWhatsAppForm />
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
