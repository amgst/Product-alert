import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { ensureDefaultRule } from "../inventory";
import { sendEmailMessage, sendWhatsAppMessage } from "../notifications.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const rule = await ensureDefaultRule(session.shop);
  return { rule };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "save-recipients") {
    const rule = await ensureDefaultRule(session.shop);
    await prisma.alertRule.update({
      where: { id: rule.id },
      data: {
        recipients: String(formData.get("recipients") || ""),
        whatsappRecipients: String(formData.get("whatsappRecipients") || "") || null,
      },
    });
    return { intent, ok: true };
  }

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
  const { rule } = useLoaderData<typeof loader>();
  const saveFetcher = useFetcher<{ ok: boolean }>();

  return (
    <>
      <PageHeader eyebrow="App configuration" title="Settings">
        <button className="primary" type="submit" form="settings-form" disabled={saveFetcher.state !== "idle"}>
          {saveFetcher.state !== "idle" ? "Saving…" : "Save settings"}
        </button>
      </PageHeader>

      <section className="settings-grid">
        <div className="panel">
          <div className="panel-header compact">
            <div>
              <h2>Notification channels</h2>
              <p>Where should low-stock alerts be delivered for this store?</p>
            </div>
          </div>
          <saveFetcher.Form className="rule-form" id="settings-form" method="post">
            <input type="hidden" name="intent" value="save-recipients" />
            <label>
              Email recipients
              <input name="recipients" type="text" defaultValue={rule.recipients} placeholder="you@example.com, staff@example.com" />
            </label>
            <label>
              WhatsApp recipients
              <input name="whatsappRecipients" type="text" defaultValue={rule.whatsappRecipients ?? ""} placeholder="+14155551234, +14155555678" />
            </label>
            {saveFetcher.data?.ok && <p style={{ color: "var(--ok)" }}>Saved.</p>}
          </saveFetcher.Form>
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
