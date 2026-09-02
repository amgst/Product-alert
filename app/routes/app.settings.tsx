import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Link, useFetcher, useLoaderData, useSearchParams } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { ensureDefaultRule } from "../inventory";
import { sendEmailMessage, sendWhatsAppMessage } from "../notifications.server";
import { syncPlan } from "../billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const rule = await ensureDefaultRule(session.shop);
  const hasWhatsApp = await syncPlan(session.shop, billing);
  return { rule, hasWhatsApp };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "save-recipients") {
    const hasWhatsApp = await syncPlan(session.shop, billing);
    const whatsappRecipients = String(formData.get("whatsappRecipients") || "").trim();
    if (whatsappRecipients && !hasWhatsApp) {
      return { intent, ok: false, error: "WhatsApp alerts require the Pro plan." };
    }

    const rule = await ensureDefaultRule(session.shop);
    await prisma.alertRule.update({
      where: { id: rule.id },
      data: {
        recipients: String(formData.get("recipients") || ""),
        whatsappRecipients: whatsappRecipients || null,
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
    const hasWhatsApp = await syncPlan(session.shop, billing);
    if (!hasWhatsApp) {
      return { intent, ok: false, error: "WhatsApp alerts require the Pro plan." };
    }

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

function TestWhatsAppForm({ hasWhatsApp }: { hasWhatsApp: boolean }) {
  const fetcher = useFetcher<{ ok: boolean; error?: string }>();
  const busy = fetcher.state !== "idle";

  if (!hasWhatsApp) {
    return (
      <div className="rule-form">
        <p style={{ color: "var(--muted)" }}>WhatsApp test messages require the Pro plan.</p>
      </div>
    );
  }

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
  const { rule, hasWhatsApp } = useLoaderData<typeof loader>();
  const saveFetcher = useFetcher<{ ok: boolean }>();
  const [searchParams] = useSearchParams();
  const billingError = searchParams.get("billingError");

  return (
    <>
      <PageHeader eyebrow="App configuration" title="Settings">
        <button className="primary" type="submit" form="settings-form" disabled={saveFetcher.state !== "idle"}>
          {saveFetcher.state !== "idle" ? "Saving…" : "Save settings"}
        </button>
      </PageHeader>

      {billingError && (
        <div className="panel" style={{ borderColor: "var(--danger)" }}>
          <p style={{ color: "var(--danger)" }}>{billingError}</p>
        </div>
      )}
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
              WhatsApp recipients {!hasWhatsApp && <span className="badge">Pro plan</span>}
              <input
                name="whatsappRecipients"
                type="text"
                defaultValue={rule.whatsappRecipients ?? ""}
                placeholder="+14155551234, +14155555678"
                disabled={!hasWhatsApp}
              />
            </label>
            {saveFetcher.data?.ok && <p style={{ color: "var(--ok)" }}>Saved.</p>}
            {saveFetcher.data && !saveFetcher.data.ok && "error" in saveFetcher.data && (
              <p style={{ color: "var(--danger)" }}>{String(saveFetcher.data.error)}</p>
            )}
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
          <TestWhatsAppForm hasWhatsApp={hasWhatsApp} />
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
            <p>
              {hasWhatsApp
                ? "Pro plan — email and WhatsApp alerts included."
                : "Free plan — email alerts included. Upgrade to Pro for WhatsApp alerts."}
            </p>
          </div>
          <div className="price">{hasWhatsApp ? "$9" : "$0"}<span>/month</span></div>
          {!hasWhatsApp && (
            <Link className="primary full" to="/app/billing/upgrade">
              Upgrade to Pro — $9/mo
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
