import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { mapZincStatus, canTransition } from "@/lib/order-state";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const requestId = data.request_id;

    if (!requestId) {
      return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { zincOrderId: requestId },
    });

    // Log every webhook payload
    await prisma.webhookLog.create({
      data: {
        source: "zinc",
        orderId: order?.id ?? null,
        payload: data,
      },
    });

    if (!order) {
      console.error("Zinc webhook: no order found for request_id", requestId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Determine new status from Zinc response
    const isError = data._type === "error" && data.code !== "request_processing";
    const hasBeenPlaced =
      data._type === "order_response" && data.merchant_order_ids?.length > 0;

    let zincStatus: string;
    if (isError) zincStatus = "failed";
    else if (hasBeenPlaced) zincStatus = "order_placed";
    else zincStatus = data.status ?? "pending";

    const mappedStatus = mapZincStatus(zincStatus);

    if (mappedStatus && mappedStatus !== order.status && canTransition(order.status, mappedStatus)) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: mappedStatus },
      });

      console.log(`Zinc webhook: order ${order.id} transitioned ${order.status} → ${mappedStatus}`);

      // TODO: Send email notification for status change
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Zinc webhook error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
