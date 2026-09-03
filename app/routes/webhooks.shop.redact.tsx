import type { ActionFunctionArgs } from "react-router";
import prisma from "../db";
import { authenticate } from "../shopify";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for shop: ${shop}`);

  if (shop) {
    // 48 hours after app uninstallation, delete shop records from database
    await prisma.session.deleteMany({ where: { shop } });
    await prisma.alertRule.deleteMany({ where: { shop } });
    await prisma.productThreshold.deleteMany({ where: { shop } });
    await prisma.notificationEvent.deleteMany({ where: { shop } });
    await prisma.shop.deleteMany({ where: { shop } });
  }

  return new Response();
};
