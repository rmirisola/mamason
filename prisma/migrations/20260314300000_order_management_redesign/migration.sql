-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('BINANCE', 'STRIPE');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('pending', 'paid', 'expired');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM (
  'created',
  'fulfillment_pending',
  'fulfillment_failed',
  'ordering_from_amazon',
  'ordered_on_amazon',
  'shipped_to_warehouse',
  'received_at_warehouse',
  'shipped_to_venezuela',
  'in_transit_venezuela',
  'delivered'
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "productPrice" DOUBLE PRECISION NOT NULL,
    "productImage" TEXT,
    "productWeight" TEXT,
    "paymentProvider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT NOT NULL,
    "checkoutUrl" TEXT,
    "qrContent" TEXT,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_providerRef_key" ON "CheckoutSession"("providerRef");
CREATE UNIQUE INDEX "CheckoutSession_orderId_key" ON "CheckoutSession"("orderId");
CREATE INDEX "CheckoutSession_status_expiresAt_idx" ON "CheckoutSession"("status", "expiresAt");

-- Migrate existing Order data: add new columns with defaults, then drop old columns

-- Step 1: Add new columns with defaults for existing rows
ALTER TABLE "Order" ADD COLUMN "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'BINANCE';
ALTER TABLE "Order" ADD COLUMN "paymentRef" TEXT;
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'created';

-- Step 2: Backfill paymentRef from merchantTradeNo
UPDATE "Order" SET "paymentRef" = "merchantTradeNo" WHERE "paymentRef" IS NULL;

-- Step 3: Backfill paidAt from updatedAt for paid orders, createdAt for others
UPDATE "Order" SET "paidAt" = COALESCE("updatedAt", "createdAt") WHERE "paidAt" IS NULL;

-- Step 4: Backfill status from old fields
UPDATE "Order" SET "status" = 'fulfillment_failed' WHERE "zincStatus" = 'failed';
UPDATE "Order" SET "status" = 'ordering_from_amazon' WHERE "zincStatus" IN ('pending', 'in_progress');
UPDATE "Order" SET "status" = 'ordered_on_amazon' WHERE "zincStatus" = 'order_placed';
UPDATE "Order" SET "status" = 'shipped_to_warehouse' WHERE "zincStatus" = 'shipped';
UPDATE "Order" SET "status" = 'received_at_warehouse' WHERE "zincStatus" = 'delivered' AND ("orderStatus" IS NULL OR "orderStatus" = '');
UPDATE "Order" SET "status" = 'received_at_warehouse' WHERE "orderStatus" = 'at_warehouse';
UPDATE "Order" SET "status" = 'shipped_to_venezuela' WHERE "orderStatus" = 'shipped_to_ve';
UPDATE "Order" SET "status" = 'in_transit_venezuela' WHERE "orderStatus" = 'in_transit_ve';
UPDATE "Order" SET "status" = 'delivered' WHERE "orderStatus" = 'delivered';

-- Step 5: Make columns NOT NULL now that they're backfilled
ALTER TABLE "Order" ALTER COLUMN "paymentRef" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "paidAt" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "userId" SET NOT NULL;

-- Step 6: Remove default from paymentProvider (was only for migration)
ALTER TABLE "Order" ALTER COLUMN "paymentProvider" DROP DEFAULT;

-- Step 7: Add unique constraint on paymentRef
CREATE UNIQUE INDEX "Order_paymentRef_key" ON "Order"("paymentRef");

-- Step 8: Add indexes
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- Step 9: Drop old columns
ALTER TABLE "Order" DROP COLUMN "merchantTradeNo";
ALTER TABLE "Order" DROP COLUMN "paymentStatus";
ALTER TABLE "Order" DROP COLUMN "zincStatus";
ALTER TABLE "Order" DROP COLUMN "orderStatus";

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
