import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify";
import prisma from "../db";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (process.env.NODE_ENV === "production") {
    throw new Response("Not found", { status: 404 });
  }

  await authenticate.admin(request);

  const env = {
    SHOPIFY_API_KEY: Boolean(process.env.SHOPIFY_API_KEY),
    SHOPIFY_API_SECRET: Boolean(process.env.SHOPIFY_API_SECRET),
    SHOPIFY_APP_URL: Boolean(process.env.SHOPIFY_APP_URL),
    SCOPES: Boolean(process.env.SCOPES),
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

  return { ok: true, env, db, time: new Date().toISOString() };
};
