import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, Link, redirect, useActionData, useFetcher, useLoaderData } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { ensureDefaultRule } from "../inventory";
import { syncPlan } from "../billing.server";
import type { AlertRule } from "@prisma/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  // ensureDefaultRule must finish before the findMany below, so the just-created
  // default rule is guaranteed to show up on a shop's very first load.
  const [, hasWhatsApp] = await Promise.all([
    ensureDefaultRule(session.shop),
    syncPlan(session.shop, billing),
  ]);
  return {
    hasWhatsApp,
    rules: await prisma.alertRule.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "asc" },
    }),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "create");

  if (intent === "delete") {
    const ruleId = String(formData.get("ruleId") || "");
    await prisma.alertRule.deleteMany({ where: { id: ruleId, shop: session.shop } });
    return { ok: true };
  }

  if (intent === "toggle-active") {
    const ruleId = String(formData.get("ruleId") || "");
    const rule = await prisma.alertRule.findFirst({ where: { id: ruleId, shop: session.shop } });
    if (!rule) return { ok: false, error: "Rule not found." };

    await prisma.alertRule.update({ where: { id: rule.id }, data: { active: !rule.active } });
    return { ok: true };
  }

  const whatsappRecipients = String(formData.get("whatsappRecipients") || "").trim();

  if (whatsappRecipients) {
    const hasWhatsApp = await syncPlan(session.shop, billing);
    if (!hasWhatsApp) {
      return { ok: false, error: "WhatsApp alerts require the Pro plan." };
    }
  }

  if (intent === "update") {
    const ruleId = String(formData.get("ruleId") || "");
    await prisma.alertRule.updateMany({
      where: { id: ruleId, shop: session.shop },
      data: {
        name: String(formData.get("name") || "Low stock rule"),
        triggerType: String(formData.get("triggerType") || "at_or_below_minimum"),
        checkFrequency: String(formData.get("checkFrequency") || "hourly"),
        recipients: String(formData.get("recipients") || ""),
        whatsappRecipients: whatsappRecipients || null,
        defaultMinimum: Number(formData.get("defaultMinimum") || 15),
      },
    });
    return { ok: true };
  }

  await prisma.alertRule.create({
    data: {
      shop: session.shop,
      name: String(formData.get("name") || "New low stock rule"),
      triggerType: String(formData.get("triggerType") || "at_or_below_minimum"),
      checkFrequency: String(formData.get("checkFrequency") || "hourly"),
      recipients: String(formData.get("recipients") || ""),
      whatsappRecipients: whatsappRecipients || null,
      defaultMinimum: Number(formData.get("defaultMinimum") || 15),
      active: true,
    },
  });

  return redirect("/app/alerts");
};

function RuleCard({ rule, hasWhatsApp }: { rule: AlertRule; hasWhatsApp: boolean }) {
  const [editing, setEditing] = useState(false);
  const updateFetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const deleting = deleteFetcher.state !== "idle";

  if (editing) {
    return (
      <article className="panel rule-card" key={rule.id}>
        <updateFetcher.Form
          className="rule-form"
          method="post"
          onSubmit={() => setEditing(false)}
        >
          <input type="hidden" name="intent" value="update" />
          <input type="hidden" name="ruleId" value={rule.id} />
          <label>Rule name<input name="name" type="text" defaultValue={rule.name} /></label>
          <label>Trigger<select name="triggerType" defaultValue={rule.triggerType}><option value="at_or_below_minimum">At or below minimum</option><option value="below_minimum">Below minimum only</option><option value="out_of_stock">Out of stock</option></select></label>
          <label>Frequency<select name="checkFrequency" defaultValue={rule.checkFrequency}><option value="hourly">Every hour</option><option value="three_hours">Every 3 hours</option><option value="daily">Daily summary</option></select></label>
          <label>Default minimum<input name="defaultMinimum" type="number" min="0" defaultValue={rule.defaultMinimum} /></label>
          <label>Recipients<input name="recipients" type="text" defaultValue={rule.recipients} /></label>
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
          <div className="rule-actions">
            <button className="primary" type="submit">Save</button>
            <button className="ghost" type="button" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </updateFetcher.Form>
      </article>
    );
  }

  return (
    <article className="panel rule-card" key={rule.id}>
      <div className="rule-title">
        <div>
          <h2>{rule.name}</h2>
          <p>{rule.appliesTo.replaceAll("_", " ")}</p>
        </div>
        <span className={`pill ${rule.active ? "ok" : "warning"}`}>{rule.active ? "Active" : "Paused"}</span>
      </div>
      <dl>
        <div><dt>Trigger</dt><dd>{rule.triggerType.replaceAll("_", " ")}</dd></div>
        <div><dt>Frequency</dt><dd>{rule.checkFrequency.replaceAll("_", " ")}</dd></div>
        <div><dt>Recipients</dt><dd>{rule.recipients}</dd></div>
        {rule.whatsappRecipients && <div><dt>WhatsApp</dt><dd>{rule.whatsappRecipients}</dd></div>}
        <div><dt>Default minimum</dt><dd>{rule.defaultMinimum} units</dd></div>
      </dl>
      <div className="rule-actions">
        <button className="ghost" type="button" onClick={() => setEditing(true)}>Edit</button>
        <toggleFetcher.Form method="post">
          <input type="hidden" name="intent" value="toggle-active" />
          <input type="hidden" name="ruleId" value={rule.id} />
          <button className="ghost" type="submit" disabled={toggleFetcher.state !== "idle"}>
            {rule.active ? "Pause" : "Resume"}
          </button>
        </toggleFetcher.Form>
        <deleteFetcher.Form
          method="post"
          onSubmit={(event) => {
            if (!confirm(`Delete the rule "${rule.name}"? This can't be undone.`)) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="ruleId" value={rule.id} />
          <button className="ghost danger" type="submit" disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </deleteFetcher.Form>
      </div>
    </article>
  );
}

export default function Alerts() {
  const { rules, hasWhatsApp } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <>
      <PageHeader eyebrow="Rules and escalation" title="Alerts" />
      <section className="workspace">
        <div className="rule-grid">
          {rules.map((rule: AlertRule) => (
            <RuleCard key={rule.id} rule={rule} hasWhatsApp={hasWhatsApp} />
          ))}
        </div>

        <aside className="panel rules-panel">
          <div className="panel-header compact">
            <div>
              <h2>New alert rule</h2>
              <p>Create another rule for collections, products, or escalation.</p>
            </div>
          </div>
          <Form className="rule-form" method="post">
            <label>Rule name<input name="name" type="text" defaultValue="Critical low stock" /></label>
            <label>Trigger<select name="triggerType" defaultValue="at_or_below_minimum"><option value="at_or_below_minimum">At or below minimum</option><option value="below_minimum">Below minimum only</option><option value="out_of_stock">Out of stock</option></select></label>
            <label>Frequency<select name="checkFrequency" defaultValue="hourly"><option value="hourly">Every hour</option><option value="three_hours">Every 3 hours</option><option value="daily">Daily summary</option></select></label>
            <label>Default minimum<input name="defaultMinimum" type="number" min="0" defaultValue="15" /></label>
            <label>Recipients<input name="recipients" type="text" defaultValue="ops@example.com" /></label>
            <label>
              WhatsApp recipients {!hasWhatsApp && <span className="badge">Pro plan</span>}
              <input
                name="whatsappRecipients"
                type="text"
                placeholder="+14155551234, +14155555678"
                disabled={!hasWhatsApp}
              />
            </label>
            {!hasWhatsApp && (
              <p style={{ color: "var(--muted)" }}>
                <Link to="/app/billing/upgrade">Upgrade to Pro</Link> to enable WhatsApp alerts.
              </p>
            )}
            {actionData && !actionData.ok && (
              <p style={{ color: "var(--danger)" }}>{actionData.error}</p>
            )}
            <button className="primary full" type="submit">Create rule</button>
          </Form>
        </aside>
      </section>
    </>
  );
}
