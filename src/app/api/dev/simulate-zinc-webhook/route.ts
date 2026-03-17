import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

/**
 * Admin-only: Simulate a Zinc webhook for testing.
 * POST /api/dev/simulate-zinc-webhook
 * Body: { orderId: string, zincStatus: "pending" | "order_placed" | "shipped" | "delivered" | "failed" }
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { orderId, zincStatus } = await request.json();

  if (!orderId || !zincStatus) {
    return NextResponse.json({ error: "orderId and zincStatus required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order?.zincOrderId) {
    return NextResponse.json({ error: "Order not found or no zincOrderId" }, { status: 404 });
  }

  // Build a fake Zinc webhook payload
  const payloads: Record<string, Record<string, unknown>> = {
    pending: {
      _type: "error",
      code: "request_processing",
      message: "Request is currently processing.",
      request_id: order.zincOrderId,
    },
    order_placed: {
      _type: "order_response",
      request_id: order.zincOrderId,
      status: "order_placed",
      merchant_order_ids: [
        { merchant_order_id: "mock-" + Date.now(), merchant: "amazon" },
      ],
      delivery_dates: [
        { date: new Date(Date.now() + 2 * 86400000).toISOString() },
      ],
    },
    shipped: {
      _type: "order_response",
      request_id: order.zincOrderId,
      status: "shipped",
      tracking: [
        {
          tracking_number: "MOCK1Z999AA10123456784",
          carrier: "UPS",
          tracking_url: "https://t.17track.net/en#nums=MOCK1Z999AA10123456784",
        },
      ],
    },
    delivered: {
      _type: "order_response",
      request_id: order.zincOrderId,
      status: "delivered",
    },
    failed: {
      _type: "error",
      code: "out_of_stock",
      message: "Product is out of stock.",
      request_id: order.zincOrderId,
    },
  };

  const payload = payloads[zincStatus];
  if (!payload) {
    return NextResponse.json(
      { error: `Invalid zincStatus. Use: ${Object.keys(payloads).join(", ")}` },
      { status: 400 }
    );
  }

  // POST to our own webhook handler
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/zinc/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  return NextResponse.json({
    simulated: zincStatus,
    webhookResponse: result,
    orderStatus: (await prisma.order.findUnique({ where: { id: orderId } }))?.status,
  });
}
