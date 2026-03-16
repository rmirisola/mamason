import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createZincOrder } from "@/lib/zinc";
import { requireAdmin } from "@/lib/admin";
import { transitionOrder } from "@/lib/order-state";

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "fulfillment_failed") {
      return NextResponse.json(
        { error: "Only failed orders can be retried" },
        { status: 400 }
      );
    }

    // Transition to fulfillment_pending (validates via state machine)
    transitionOrder(order.status, "fulfillment_pending");

    const maxPrice = order.productPrice * 1.1;
    const zincOrder = await createZincOrder(order.asin, maxPrice, order.id);

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
    console.error("Route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
