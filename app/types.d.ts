declare module "@prisma/client" {
  export class PrismaClient {
    session: {
      deleteMany(args?: unknown): Promise<unknown>;
    };
    alertRule: {
      count(args?: unknown): Promise<number>;
      create(args: unknown): Promise<AlertRule>;
      deleteMany(args?: unknown): Promise<unknown>;
      findFirst(args?: unknown): Promise<AlertRule | null>;
      findMany(args?: unknown): Promise<AlertRule[]>;
    };
    productThreshold: {
      deleteMany(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<ProductThreshold[]>;
      upsert(args: unknown): Promise<ProductThreshold>;
    };
    notificationEvent: {
      count(args?: unknown): Promise<number>;
      create(args: unknown): Promise<NotificationEvent>;
      deleteMany(args?: unknown): Promise<unknown>;
      findMany(args?: unknown): Promise<NotificationEvent[]>;
    };
  }

  export type AlertRule = {
    id: string;
    shop: string;
    name: string;
    appliesTo: string;
    triggerType: string;
    checkFrequency: string;
    recipients: string;
    active: boolean;
    defaultMinimum: number;
    createdAt: Date;
    updatedAt: Date;
  };

  export type ProductThreshold = {
    id: string;
    shop: string;
    productId: string;
    variantId: string | null;
    sku: string | null;
    productTitle: string;
    variantTitle: string | null;
    minimumStock: number;
    reorderQuantity: number;
    watchEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  export type NotificationEvent = {
    id: string;
    shop: string;
    productId: string | null;
    variantId: string | null;
    title: string;
    message: string;
    level: string;
    recipient: string | null;
    sentAt: Date;
  };
}
