import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";
import { ensureDefaultRule } from "../inventory";
import type { AlertRule } from "@prisma/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  await ensureDefaultRule(session.shop);
  return {
    rules: await prisma.alertRule.findMany({
      where: { shop: session.shop },
      orderBy: { createdAt: "asc" },
    }),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  await prisma.alertRule.create({
    data: {
      shop: session.shop,
      name: String(formData.get("name") || "New low stock rule"),
      triggerType: String(formData.get("triggerType") || "at_or_below_minimum"),
      checkFrequency: String(formData.get("checkFrequency") || "hourly"),
      recipients: String(formData.get("recipients") || ""),
      defaultMinimum: Number(formData.get("defaultMinimum") || 15),
      active: true,
    },
  });

  return redirect("/app/alerts");
};

export default function Alerts() {
  const { rules } = useLoaderData<typeof loader>();

  return (
    <>
      <PageHeader eyebrow="Rules and escalation" title="Alerts" />
      <section className="workspace">
        <div className="rule-grid">
          {rules.map((rule: AlertRule) => (
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
                <div><dt>Default minimum</dt><dd>{rule.defaultMinimum} units</dd></div>
              </dl>
            </article>
          ))}
        </div>

        <aside className="panel rules-panel">
          <div className="panel-header compact">
            <div>
              <h2>New alert rule</h2>
              <p>Create another rule for collections, products, or escalation.</p>
            </div>
          </div>
          <form className="rule-form" method="post">
            <label>Rule name<input name="name" type="text" defaultValue="Critical low stock" /></label>
            <label>Trigger<select name="triggerType" defaultValue="at_or_below_minimum"><option value="at_or_below_minimum">At or below minimum</option><option value="below_minimum">Below minimum only</option><option value="out_of_stock">Out of stock</option></select></label>
            <label>Frequency<select name="checkFrequency" defaultValue="hourly"><option value="hourly">Every hour</option><option value="three_hours">Every 3 hours</option><option value="daily">Daily summary</option></select></label>
            <label>Default minimum<input name="defaultMinimum" type="number" min="0" defaultValue="15" /></label>
            <label>Recipients<input name="recipients" type="text" defaultValue="ops@example.com" /></label>
            <button className="primary full" type="submit">Create rule</button>
          </form>
        </aside>
      </section>
    </>
  );
}
