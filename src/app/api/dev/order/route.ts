import { NextRequest, NextResponse } from "next/server";
import { createZincOrder } from "@/lib/zinc";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { asin, title, price, image, weight } = await request.json();

    if (!asin || !title || !price) {
      return NextResponse.json(
        { error: "asin, title, and price are required" },
        { status: 400 }
      );
    }

    const providerRef = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

    // Create CheckoutSession(paid) + Order in one transaction
    const { order } = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: user.id,
          customerEmail: user.email,
          asin,
          productTitle: title,
          productPrice: price,
          productImage: image ?? null,
          productWeight: weight ?? null,
          paymentProvider: "BINANCE",
          paymentRef: providerRef,
          paidAt: new Date(),
          status: "created",
        },
      });

      await tx.checkoutSession.create({
        data: {
          userId: user.id,
          customerEmail: user.email,
          asin,
          productTitle: title,
          productPrice: price,
          productImage: image ?? null,
          productWeight: weight ?? null,
          paymentProvider: "BINANCE",
          providerRef,
          status: "paid",
          expiresAt: new Date(),
          orderId: order.id,
        },
      });

      return { order };
    });

    // Attempt Zinc order
    try {
      const maxPrice = price * 1.1;
      const zincOrder = await createZincOrder(asin, maxPrice, order.id);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          zincOrderId: zincOrder.id,
          status: "fulfillment_pending",
        },
      });

      return NextResponse.json({
        orderId: order.id,
        zincOrderId: zincOrder.id,
        status: "fulfillment_pending",
      });
    } catch (error) {
      console.error("Zinc order failed for dev order", order.id, error);
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "fulfillment_failed" },
      });

      return NextResponse.json({
        orderId: order.id,
        status: "fulfillment_failed",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
