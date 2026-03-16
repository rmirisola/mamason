import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getZincOrder } from "@/lib/zinc";
import { estimateOwcShippingCents } from "@/lib/owc-shipping";
import { requireAdmin } from "@/lib/admin";
import { isActiveFulfillmentState, mapZincStatus, canTransition } from "@/lib/order-state";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let zincDetails = null;
  if (order.zincOrderId) {
    try {
      zincDetails = await getZincOrder(order.zincOrderId);

      // Update order status from Zinc if applicable
      if (isActiveFulfillmentState(order.status)) {
        const mappedStatus = mapZincStatus(zincDetails.status);
        if (mappedStatus && mappedStatus !== order.status && canTransition(order.status, mappedStatus)) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: mappedStatus },
          });
          order.status = mappedStatus;
        }
      }
    } catch {
      zincDetails = { error: "Failed to fetch Zinc details" };
    }
  }

  let owcEstimate = null;
  try {
    owcEstimate = await estimateOwcShippingCents(order.productWeight);
  } catch {
    // ignore
  }

  return NextResponse.json({ order, zincDetails, owcEstimate });
}
