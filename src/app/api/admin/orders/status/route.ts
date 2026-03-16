import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { canTransition, transitionOrder } from "@/lib/order-state";
import { OrderStatus } from "@prisma/client";

const VALID_STATUSES = Object.values(OrderStatus) as string[];

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId and status are required" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!canTransition(order.status, status as OrderStatus)) {
      return NextResponse.json(
        { error: `Invalid transition: ${order.status} → ${status}` },
        { status: 400 }
      );
    }

    transitionOrder(order.status, status as OrderStatus);

    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as OrderStatus },
    });

    return NextResponse.json({ orderId, status });
  } catch (error) {
    console.error("Route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
