CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "isOnline" BOOLEAN NOT NULL DEFAULT false,
  "scope" TEXT,
  "expires" DATETIME,
  "accessToken" TEXT NOT NULL,
  "userId" BIGINT,
  "firstName" TEXT,
  "lastName" TEXT,
  "email" TEXT,
  "accountOwner" BOOLEAN NOT NULL DEFAULT false,
  "locale" TEXT,
  "collaborator" BOOLEAN DEFAULT false,
  "emailVerified" BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS "AlertRule" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "appliesTo" TEXT NOT NULL DEFAULT 'all_products',
  "triggerType" TEXT NOT NULL DEFAULT 'at_or_below_minimum',
  "checkFrequency" TEXT NOT NULL DEFAULT 'hourly',
  "recipients" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "defaultMinimum" INTEGER NOT NULL DEFAULT 15,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "AlertRule_shop_idx" ON "AlertRule"("shop");

CREATE TABLE IF NOT EXISTS "ProductThreshold" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "sku" TEXT,
  "productTitle" TEXT NOT NULL,
  "variantTitle" TEXT,
  "minimumStock" INTEGER NOT NULL DEFAULT 10,
  "reorderQuantity" INTEGER NOT NULL DEFAULT 50,
  "watchEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductThreshold_shop_productId_variantId_key" ON "ProductThreshold"("shop", "productId", "variantId");
CREATE INDEX IF NOT EXISTS "ProductThreshold_shop_idx" ON "ProductThreshold"("shop");

CREATE TABLE IF NOT EXISTS "NotificationEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "productId" TEXT,
  "variantId" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'warning',
  "recipient" TEXT,
  "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "NotificationEvent_shop_idx" ON "NotificationEvent"("shop");
