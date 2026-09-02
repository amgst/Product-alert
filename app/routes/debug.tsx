import type { LoaderFunctionArgs } from "react-router";
import prisma from "../db";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const env = {
    SHOPIFY_API_KEY: Boolean(process.env.SHOPIFY_API_KEY),
    SHOPIFY_API_SECRET: Boolean(process.env.SHOPIFY_API_SECRET),
    SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || null,
    SCOPES: process.env.SCOPES || null,
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    DIRECT_URL: Boolean(process.env.DIRECT_URL),
  };

  let db: { ok: boolean; error?: string } = { ok: false };
  try {
    await prisma.session.count();
    db = { ok: true };
  } catch (error) {
    db = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  console.log("[debug] request", request.url, { env, db });

  return { ok: true, env, db, time: new Date().toISOString() };
};
