import { NextRequest, NextResponse } from "next/server";
import { createPaymentOrder } from "@/lib/binance";
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

    // Create session first so we have the ID for mock URLs
    const session = await prisma.checkoutSession.create({
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
        expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
      },
    });

    // Create payment order (mock URL uses sessionId)
    const payment = await createPaymentOrder(providerRef, price, title, session.id);

    // Update session with payment URLs
    await prisma.checkoutSession.update({
      where: { id: session.id },
      data: {
        checkoutUrl: payment.checkoutUrl,
        qrContent: payment.qrContent,
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
