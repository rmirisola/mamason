import { NextRequest, NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const CHECKOUT_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(request: NextRequest) {
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

    // Deduplicate: reuse existing pending session for same ASIN
    const existing = await prisma.checkoutSession.findFirst({
      where: {
        userId: user.id,
        asin,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return NextResponse.json({ sessionId: existing.id });
    }

    const providerRef = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

    const session = await prisma.checkoutSession.create({
      data: {
        userId: user.id,
        customerEmail: user.email,
        asin,
        productTitle: title,
        productPrice: price,
        productImage: image ?? null,
        productWeight: weight ?? null,
        paymentProvider: "STRIPE",
        providerRef,
        expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
      },
    });

    // Create Stripe Checkout Session
    const { checkoutUrl, stripeSessionId } = await createCheckoutSession({
      sessionId: session.id,
      amount: price,
      productTitle: title,
      customerEmail: user.email,
    });

    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        checkoutUrl,
        qrContent: stripeSessionId,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
