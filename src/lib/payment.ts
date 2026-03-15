import { prisma } from "@/lib/db";
import { createZincOrder } from "@/lib/zinc";

type PaymentResult =
  | { success: true; orderId: string }
  | { success: false; error: string };

/**
 * Handle a confirmed payment. Called by both the real webhook and mock-pay route.
 * Accepts a sessionId (for mock-pay) or providerRef (for webhook).
 */
export async function handlePaymentConfirmed(
  sessionIdOrRef: string,
  byProviderRef = false
): Promise<PaymentResult> {
  const session = byProviderRef
    ? await prisma.checkoutSession.findUnique({ where: { providerRef: sessionIdOrRef } })
    : await prisma.checkoutSession.findUnique({ where: { id: sessionIdOrRef } });

  if (!session) {
    return { success: false, error: "Session not found" };
  }

  // Idempotency layer 1: already paid
  if (session.status === "paid" && session.orderId) {
    return { success: true, orderId: session.orderId };
  }

  if (session.status === "expired") {
    return { success: false, error: "Session expired" };
  }

  // Idempotency layer 2: transaction with unique constraint on paymentRef
  let orderId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: session.userId,
          customerEmail: session.customerEmail,
          asin: session.asin,
          productTitle: session.productTitle,
          productPrice: session.productPrice,
          productImage: session.productImage,
          productWeight: session.productWeight,
          paymentProvider: session.paymentProvider,
          paymentRef: session.providerRef,
          paidAt: new Date(),
          status: "created",
        },
      });

      await tx.checkoutSession.update({
        where: { id: session.id },
        data: { status: "paid", orderId: order.id },
      });

      return order;
    });

    orderId = result.id;
  } catch (error: unknown) {
    // Idempotency layer 3: unique constraint violation on paymentRef means duplicate
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      const existing = await prisma.order.findUnique({
        where: { paymentRef: session.providerRef },
      });
      if (existing) {
        return { success: true, orderId: existing.id };
      }
    }
    throw error;
  }

  // Zinc order creation happens AFTER transaction commits
  // If Zinc fails, Order stays at "created" → admin can retry
  try {
    const maxPrice = session.productPrice * 1.1;
    const zincOrder = await createZincOrder(session.asin, maxPrice, orderId);

    await prisma.order.update({
      where: { id: orderId },
      data: {
        zincOrderId: zincOrder.id,
        status: "fulfillment_pending",
      },
    });
  } catch (error) {
    console.error("Zinc order failed for order", orderId, error);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "fulfillment_failed" },
    });
  }

  return { success: true, orderId };
}
