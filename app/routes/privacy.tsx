export default function Privacy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.6, color: "#202223" }}>
      <h1>Min Stock Notifier — Privacy Policy</h1>
      <p>Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <h2>What this app does</h2>
      <p>
        Min Stock Notifier is a Shopify app that watches a merchant's product inventory and sends
        alerts to the merchant (not to their customers) when stock drops below a threshold the
        merchant sets.
      </p>

      <h2>Information we access and store</h2>
      <p>To provide this service, the app accesses and stores:</p>
      <ul>
        <li>Your store's domain and Shopify access token, used to read product and inventory data via the Shopify Admin API.</li>
        <li>Product, variant, SKU, and inventory quantity data from your Shopify catalog, used to determine stock levels.</li>
        <li>Threshold settings you configure (minimum stock, reorder quantity, alert trigger conditions, and check frequency).</li>
        <li>Notification recipient information you provide (staff/owner email addresses, and a WhatsApp number if you enable that feature).</li>
        <li>A history of the low-stock/out-of-stock alerts the app has sent, so you can review past notifications in the app.</li>
      </ul>
      <p>
        <strong>We do not access, collect, or store any personal information about your customers.</strong>{" "}
        This app does not read customer records, orders, or checkout data.
      </p>

      <h2>Third-party services we use</h2>
      <p>To deliver notifications, the app sends the alert content (not your store's access token or customer data) to:</p>
      <ul>
        <li><a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">Resend</a>, to send email alerts.</li>
        <li><a href="https://www.twilio.com/en-us/legal/privacy" target="_blank" rel="noreferrer">Twilio</a>, to send WhatsApp alerts (Pro plan only, and only if you provide a WhatsApp recipient number).</li>
      </ul>

      <h2>Data retention and deletion</h2>
      <p>
        Your store's data is retained for as long as the app is installed. If you uninstall the app,
        Shopify notifies us automatically and we permanently delete your store's session, threshold
        settings, alert rules, and notification history from our database.
      </p>
      <p>
        This app also implements Shopify's mandatory data-request and customer-redaction webhooks.
        Since the app never stores customer personal data, there is no customer data to return or
        redact in response to those requests.
      </p>

      <h2>Data security</h2>
      <p>
        All data is transmitted over encrypted (HTTPS/TLS) connections and stored in an access-controlled
        database. Only the merchant's own store data is ever processed for that store.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data can be sent to the app's support contact listed on
        its Shopify App Store listing.
      </p>
    </div>
  );
}
