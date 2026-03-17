import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { handlePaymentConfirmed } from "@/lib/payment";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Log every webhook payload
  await prisma.webhookLog.create({
    data: {
      source: "stripe",
      payload: JSON.parse(JSON.stringify({ type: event.type, data: event.data.object })),
    },
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const lopidoSessionId = session.metadata?.lopido_session_id;

    if (lopidoSessionId && session.payment_status === "paid") {
      const result = await handlePaymentConfirmed(lopidoSessionId);
      if (!result.success) {
        console.error("Payment confirmed but order creation failed:", result.error);
      }
    }
  }

  return NextResponse.json({ received: true });
}
