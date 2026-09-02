// Usage: node --env-file=.env scripts/test-notify.mjs [email] [whatsappNumber]
// email: any address (defaults to delivered@resend.dev, Resend's safe test address)
// whatsappNumber: E.164 format, e.g. +14155551234 (must have joined your Twilio sandbox first)

const email = process.argv[2] || "delivered@resend.dev";
const whatsappNumber = process.argv[3];

async function testEmail() {
  if (!process.env.RESEND_API_KEY) {
    console.log("SKIP email — RESEND_API_KEY not set");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "MinStock Notifier <onboarding@resend.dev>",
      to: [email],
      subject: "Test: low stock alert",
      html: "<p>This is a test notification from MinStock Notifier.</p>",
    }),
  });

  const data = await res.json();
  console.log(res.ok ? `EMAIL OK -> ${email}: ${data.id}` : `EMAIL FAILED: ${JSON.stringify(data)}`);
}

async function testWhatsApp() {
  if (!whatsappNumber) {
    console.log("SKIP WhatsApp — no number passed as second argument");
    return;
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    console.log("SKIP WhatsApp — Twilio env vars not set");
    return;
  }

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
        To: `whatsapp:${whatsappNumber}`,
        Body: "Test: low stock alert from MinStock Notifier.",
      }),
    },
  );

  const data = await res.json();
  console.log(res.ok ? `WHATSAPP OK -> ${whatsappNumber}: ${data.sid}` : `WHATSAPP FAILED: ${JSON.stringify(data)}`);
}

await testEmail();
await testWhatsApp();
