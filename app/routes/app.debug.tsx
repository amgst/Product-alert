import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData } from "react-router";
import { PageHeader } from "../components";
import { authenticate } from "../shopify";
import prisma from "../db";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (process.env.NODE_ENV === "production") {
    throw new Response("Not found", { status: 404 });
  }

  let sessionShop = "Unknown";
  let authError: string | null = null;
  let adminRef: any = null;

  try {
    const { session, admin } = await authenticate.admin(request);
    sessionShop = session.shop;
    adminRef = admin;
  } catch (err: any) {
    authError = err?.message || String(err);
  }

  const envStatus = {
    SHOPIFY_API_KEY: Boolean(process.env.SHOPIFY_API_KEY),
    SHOPIFY_API_SECRET: Boolean(process.env.SHOPIFY_API_SECRET),
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || "Not set",
    SCOPES: process.env.SCOPES || "Not set",
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
  };

  let dbSessions: any[] = [];
  let dbError: string | null = null;
  try {
    dbSessions = await prisma.session.findMany({
      select: {
        id: true,
        shop: true,
        isOnline: true,
        scope: true,
        expires: true,
        accessToken: true,
      },
    });
  } catch (err: any) {
    dbError = err?.message || String(err);
  }

  let graphqlTest: { ok: boolean; status?: number; data?: any; error?: string } = {
    ok: false,
    error: "GraphQL test not executed yet.",
  };

  if (adminRef) {
    try {
      const response = await adminRef.graphql(`
        #graphql
        query DiagnosticCheck {
          shop {
            name
            myshopifyDomain
            plan {
              displayName
            }
          }
          products(first: 3) {
            nodes {
              id
              title
            }
          }
        }
      `);

      if (response.ok) {
        const json = await response.json();
        graphqlTest = { ok: true, status: response.status, data: json };
      } else {
        const text = await response.text().catch(() => "");
        graphqlTest = {
          ok: false,
          status: response.status,
          error: `HTTP ${response.status}: ${text}`,
        };
      }
    } catch (err: any) {
      const errMsg =
        err?.errors?.message ||
        err?.message ||
        (typeof err === "object" ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2) : String(err));
      graphqlTest = {
        ok: false,
        error: errMsg,
      };
    }
  }

  return {
    shop: sessionShop,
    authError,
    envStatus,
    dbSessions: dbSessions.map((s) => ({
      ...s,
      accessTokenPrefix: s.accessToken ? s.accessToken.slice(0, 12) + "..." : "NONE",
      isNonExpiring: s.accessToken?.startsWith("shpat_"),
    })),
    dbError,
    graphqlTest,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (process.env.NODE_ENV === "production") {
    throw new Response("Not found", { status: 404 });
  }

  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "reset-session") {
    await prisma.session.deleteMany({
      where: { shop: session.shop },
    });
    return { ok: true, reset: true, shop: session.shop };
  }

  return { ok: false, error: "Unknown intent" };
};

export default function DebugPage() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ ok?: boolean; reset?: boolean; shop?: string }>();

  const isResetting = fetcher.state !== "idle";

  const handleForceReauth = () => {
    if (typeof window !== "undefined") {
      const target = `/auth?shop=${encodeURIComponent(data.shop)}`;
      const fullUrl = `${window.location.origin}${target}`;
      if (window.top && window.top !== window) {
        window.top.location.href = fullUrl;
      } else {
        window.location.href = fullUrl;
      }
    }
  };

  useEffect(() => {
    if (fetcher.data?.reset) {
      handleForceReauth();
    }
  }, [fetcher.data]);

  return (
    <>
      <PageHeader eyebrow="Developer Diagnostics" title="App Debugger & System Status">
        <button className="primary" onClick={handleForceReauth} type="button">
          Re-authenticate Store
        </button>
      </PageHeader>

      <section className="settings-grid">
        {/* Card 1: Active Store & Session Status */}
        <div className="panel">
          <div className="panel-header compact">
            <div>
              <h2>Store & Session Diagnostics</h2>
              <p>Current active shop and session token state in PostgreSQL.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <strong>Active Shop:</strong> <code>{data.shop}</code>
            </div>
            <div>
              <strong>Authentication State:</strong>{" "}
              {data.authError ? (
                <span className="badge danger">Auth Error</span>
              ) : (
                <span className="badge ok">Authenticated</span>
              )}
            </div>
            {data.authError && (
              <div style={{ color: "var(--danger)", fontSize: 13, background: "#fff1ee", padding: 10, borderRadius: 6 }}>
                {data.authError}
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <strong>Database Sessions ({data.dbSessions.length}):</strong>
              {data.dbSessions.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: 10,
                    marginTop: 6,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong>ID:</strong> {s.id}
                  </div>
                  <div>
                    <strong>Token Type:</strong>{" "}
                    {s.isNonExpiring ? (
                      <span className="badge warning">Legacy Non-expiring (shpat_) — 403 Risk</span>
                    ) : (
                      <span className="badge ok">Modern Expiring Token</span>
                    )}
                  </div>
                  <div>
                    <strong>Prefix:</strong> <code>{s.accessTokenPrefix}</code>
                  </div>
                  <div>
                    <strong>Scopes:</strong> {s.scope || "None"}
                  </div>
                </div>
              ))}
            </div>

            {/* Reset Button */}
            <fetcher.Form method="post" style={{ marginTop: 16 }}>
              <input type="hidden" name="intent" value="reset-session" />
              <button className="danger full" type="submit" disabled={isResetting}>
                {isResetting ? "Clearing Session…" : "Clear Session Row & Force OAuth"}
              </button>
            </fetcher.Form>

            {fetcher.data?.reset && (
              <div style={{ color: "var(--ok)", fontSize: 13, marginTop: 8 }}>
                Session cleared for {fetcher.data.shop}. Click Re-authenticate Store above or refresh.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Environment Configuration */}
        <div className="panel">
          <div className="panel-header compact">
            <div>
              <h2>Environment Variables</h2>
              <p>System configuration loaded on Vercel / server.</p>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>SHOPIFY_API_KEY</span>
              <span className={`badge ${data.envStatus.SHOPIFY_API_KEY ? "ok" : "danger"}`}>
                {data.envStatus.SHOPIFY_API_KEY ? "Set" : "Missing"}
              </span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>SHOPIFY_API_SECRET</span>
              <span className={`badge ${data.envStatus.SHOPIFY_API_SECRET ? "ok" : "danger"}`}>
                {data.envStatus.SHOPIFY_API_SECRET ? "Set" : "Missing"}
              </span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>SHOPIFY_APP_URL</span>
              <code>{data.envStatus.SHOPIFY_APP_URL}</code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>SCOPES</span>
              <code>{data.envStatus.SCOPES}</code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>DATABASE_URL</span>
              <span className={`badge ${data.envStatus.DATABASE_URL ? "ok" : "danger"}`}>
                {data.envStatus.DATABASE_URL ? "Set" : "Missing"}
              </span>
            </li>
          </ul>
        </div>

        {/* Card 3: Live GraphQL API Test */}
        <div className="panel" style={{ gridColumn: "1 / -1" }}>
          <div className="panel-header compact">
            <div>
              <h2>Shopify GraphQL API Test Result</h2>
              <p>Live test execution of Admin GraphQL <code>products</code> query.</p>
            </div>
          </div>
          <div
            style={{
              background: "#1e2022",
              color: "#e1e4e8",
              padding: 16,
              borderRadius: 8,
              fontFamily: "monospace",
              fontSize: 13,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {data.graphqlTest.ok ? (
              <div style={{ color: "#7ee787", marginBottom: 8 }}>✔ GraphQL Query Success (HTTP {data.graphqlTest.status})</div>
            ) : (
              <div style={{ color: "#ff7b72", marginBottom: 8 }}>❌ GraphQL Query Failed:</div>
            )}
            {JSON.stringify(data.graphqlTest, null, 2)}
          </div>
        </div>
      </section>
    </>
  );
}
