import { Resend } from "resend";
import prisma from "./db";
import { hasWhatsAppAccess } from "./billing.server";
import type { AlertRule } from "@prisma/client";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "MinStock Notifier <onboarding@resend.dev>";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM;

function parseList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_FROM) {
    return { ok: false, error: "Twilio credentials are not configured." };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: `whatsapp:${TWILIO_WHATSAPP_FROM}`,
        To: `whatsapp:${to}`,
        Body: body,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Failed to send WhatsApp message to ${to}: ${response.status} ${detail}`);
    return { ok: false, error: detail };
  }

  return { ok: true };
}

export async function sendEmailMessage(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: [to], subject, html });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function notifyLowStock(params: {
  shop: string;
  eventId: string;
  title: string;
  message: string;
}) {
  const { shop, eventId, title, message } = params;

  const rules: AlertRule[] = await prisma.alertRule.findMany({
    where: { shop, active: true },
  });

  const emailRecipients: string[] = [
    ...new Set(rules.flatMap((rule) => parseList(rule.recipients))),
  ];
  const whatsappRecipients: string[] = [
    ...new Set(rules.flatMap((rule) => parseList(rule.whatsappRecipients))),
  ];

  const notified: string[] = [];

  if (emailRecipients.length > 0 && resend) {
    const { error } = await resend.emails.send(
      {
        from: FROM_EMAIL,
        to: emailRecipients,
        subject: title,
        html: `<p>${message}</p><p>Shop: ${shop}</p>`,
      },
      { idempotencyKey: `low-stock-alert/${eventId}` },
    );

    if (error) {
      console.error(`Failed to send low stock email for shop ${shop}:`, error.message);
    } else {
      notified.push(...emailRecipients);
    }
  } else if (emailRecipients.length > 0) {
    console.warn(`RESEND_API_KEY not set — skipping email for shop ${shop}`);
  }

  if (whatsappRecipients.length > 0 && (await hasWhatsAppAccess(shop))) {
    for (const to of whatsappRecipients) {
      const { ok } = await sendWhatsAppMessage(to, `${title}\n${message}\nShop: ${shop}`);
      if (ok) notified.push(`whatsapp:${to}`);
    }
  }

  if (notified.length > 0) {
    await prisma.notificationEvent.update({
      where: { id: eventId },
      data: { recipient: notified.join(", ") },
    });
  }
}
