import type { ActionFunctionArgs } from "react-router";
import prisma from "../db";
import { authenticate } from "../shopify";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  if (topic === "APP_UNINSTALLED" && shop) {
    if (session) {
      await prisma.session.deleteMany({ where: { shop } });
    }
    await prisma.alertRule.deleteMany({ where: { shop } });
    await prisma.productThreshold.deleteMany({ where: { shop } });
    await prisma.notificationEvent.deleteMany({ where: { shop } });
    await prisma.shop.deleteMany({ where: { shop } });
  }

  return new Response();
};
