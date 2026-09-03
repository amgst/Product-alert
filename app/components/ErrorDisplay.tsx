import { useState } from "react";
import { isRouteErrorResponse } from "react-router";

export function ErrorDisplay({ error, isRoot = false }: { error: unknown; isRoot?: boolean }) {
  const [showDetails, setShowDetails] = useState(false);

  let statusCode = 500;
  let title = "Unable to Load Application";
  let message = "An unexpected error occurred while loading MinStock Notifier.";
  let detailMessage = "";
  let isAuthError = false;
  let isDbError = false;
  let isNotFoundError = false;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    if (error.status === 404) {
      isNotFoundError = true;
      title = "Page Not Found (404)";
      message = "The page or resource you requested does not exist or has been moved.";
    } else if (error.status === 401 || error.status === 403) {
      isAuthError = true;
      title = "Shopify Session Expired";
      message = "Your Shopify Admin session token is missing or expired. Re-authentication is required to access the app.";
    } else {
      title = `Error ${error.status}: ${error.statusText || "Request Failed"}`;
      message = typeof error.data === "string" ? error.data : "The server encountered an issue while processing your request.";
    }
    detailMessage = typeof error.data === "string" ? error.data : JSON.stringify(error.data, null, 2);
  } else if (error instanceof Error) {
    detailMessage = `${error.name}: ${error.message}\n\nStack Trace:\n${error.stack || "No stack trace available."}`;
    const lowerMessage = error.message.toLowerCase();

    if (
      lowerMessage.includes("prisma") ||
      lowerMessage.includes("database") ||
      lowerMessage.includes("p1001") ||
      lowerMessage.includes("connection") ||
      lowerMessage.includes("econnrefused")
    ) {
      isDbError = true;
      title = "Database Connection Error";
      message = "Could not connect to the database server. Your settings and thresholds are safe. Please try reloading.";
    } else if (
      lowerMessage.includes("session") ||
      lowerMessage.includes("token") ||
      lowerMessage.includes("authenticate") ||
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("jwt")
    ) {
      isAuthError = true;
      title = "Authentication Error";
      message = "Your session could not be authenticated with Shopify Admin. Please re-open the app or re-authenticate.";
    } else {
      title = "Application Load Failure";
      message = error.message || "An unexpected error occurred while rendering this page.";
    }
  } else if (typeof error === "string") {
    message = error;
    detailMessage = error;
  } else if (error && typeof error === "object") {
    detailMessage = JSON.stringify(error, null, 2);
    message = (error as { message?: string }).message || "An error occurred with no specific details provided.";
  }

  const inIframe = typeof window !== "undefined" && window.top !== window;

  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const handleReauth = () => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const shop = searchParams.get("shop");
      const targetUrl = shop ? `/auth?shop=${encodeURIComponent(shop)}` : "/auth";
      const fullUrl = `${window.location.origin}${targetUrl}`;

      if (window.top && window.top !== window) {
        window.top.location.href = fullUrl;
      } else {
        window.location.href = fullUrl;
      }
    }
  };


  const containerStyle: React.CSSProperties = isRoot
    ? {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "var(--bg, #f6f7f8)",
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }
    : {
        padding: "28px",
        maxWidth: 720,
        margin: "0 auto",
      };

  return (
    <div style={containerStyle}>
      <div
        className="panel"
        style={{
          maxWidth: 640,
          width: "100%",
          margin: "0 auto",
          borderColor: isAuthError || isDbError ? "var(--warning, #b7791f)" : "var(--danger, #d72c0d)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
          background: "#ffffff",
          borderRadius: 12,
          padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: isAuthError || isDbError ? "var(--warning-bg, #fff5d6)" : "var(--danger-bg, #fff1ee)",
              color: isAuthError || isDbError ? "var(--warning, #b7791f)" : "var(--danger, #d72c0d)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: isAuthError || isDbError ? "var(--warning, #b7791f)" : "var(--danger, #d72c0d)",
                }}
              >
                {isAuthError ? "Session Alert" : isDbError ? "Database Warning" : isNotFoundError ? "Not Found" : "App Load Error"}
              </span>
              <span style={{ fontSize: 12, color: "var(--muted, #6d7175)" }}>• HTTP {statusCode}</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink, #202223)" }}>{title}</h2>
          </div>
        </div>

        <div style={{ background: "var(--bg, #f6f7f8)", borderRadius: 8, padding: 16, marginBottom: 24, border: "1px solid var(--line, #dde0e4)" }}>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink, #202223)", lineHeight: 1.5, fontWeight: 500 }}>{message}</p>
          {isAuthError && (
            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "var(--muted, #6d7175)", lineHeight: 1.4 }}>
              {inIframe
                ? "You are inside Shopify Admin. Clicking 'Reload App' will attempt to refresh your embedded session token."
                : "If you opened the app directly, please navigate to the app via your Shopify Admin dashboard."}
            </p>
          )}
          {isDbError && (
            <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "var(--muted, #6d7175)", lineHeight: 1.4 }}>
              Your store inventory rules and alert history remain saved. Please wait a moment and try refreshing.
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button className="primary" onClick={handleReload} type="button" style={{ gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6" />
              <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16" />
            </svg>
            Reload App
          </button>

          {isAuthError ? (
            <button className="ghost" onClick={handleReauth} type="button">
              Re-authenticate Store
            </button>
          ) : (
            <a className="ghost" href="/app">
              Go to Dashboard
            </a>
          )}

          <button
            className="ghost"
            style={{ marginLeft: "auto", fontSize: 13, color: "var(--muted, #6d7175)" }}
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            {showDetails ? "Hide Technical Details" : "Show Technical Details"}
          </button>
        </div>

        {showDetails && (
          <div
            style={{
              marginTop: 16,
              padding: 14,
              background: "#1e2022",
              color: "#e1e4e8",
              borderRadius: 8,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 260,
              overflowY: "auto",
              border: "1px solid #323639",
            }}
          >
            <div style={{ color: "#8b949e", marginBottom: 6, fontWeight: 600 }}>Diagnostic Information ({new Date().toISOString()}):</div>
            {detailMessage || "No additional raw error details available."}
          </div>
        )}
      </div>
    </div>
  );
}
