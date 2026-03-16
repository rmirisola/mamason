import { NextRequest, NextResponse } from "next/server";
import { getZincOrder } from "@/lib/zinc";
import { prisma } from "@/lib/db";
import { isActiveFulfillmentState, mapZincStatus, canTransition } from "@/lib/order-state";
import { getCurrentUser } from "@/lib/user";
import { OrderStatus } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== user.id) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only poll Zinc for active fulfillment states
    if (order.zincOrderId && isActiveFulfillmentState(order.status)) {
      const zincOrder = await getZincOrder(order.zincOrderId);
      const mappedStatus = mapZincStatus(zincOrder.status);

      if (mappedStatus && mappedStatus !== order.status && canTransition(order.status, mappedStatus)) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: mappedStatus },
        });
        order.status = mappedStatus;
      }

      return NextResponse.json({
        id: order.id,
        asin: order.asin,
        productTitle: order.productTitle,
        productPrice: order.productPrice,
        productImage: order.productImage,
        status: order.status,
        trackingNumbers: zincOrder.trackingNumbers ?? [],
        deliveryDate: zincOrder.deliveryDate ?? null,
      });
    }

    return NextResponse.json({
      id: order.id,
      asin: order.asin,
      productTitle: order.productTitle,
      productPrice: order.productPrice,
      productImage: order.productImage,
      status: order.status,
      trackingNumbers: [],
      deliveryDate: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
