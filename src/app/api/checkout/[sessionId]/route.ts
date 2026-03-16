import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const { sessionId } = await params;

    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Lazy expiry: mark as expired on read
    if (session.status === "pending" && session.expiresAt < new Date()) {
      await prisma.checkoutSession.update({
        where: { id: session.id },
        data: { status: "expired" },
      });

      return NextResponse.json({
        id: session.id,
        status: "expired",
        asin: session.asin,
        productTitle: session.productTitle,
        productPrice: session.productPrice,
        productImage: session.productImage,
        checkoutUrl: session.checkoutUrl,
        qrContent: session.qrContent,
        expiresAt: session.expiresAt.toISOString(),
        orderId: null,
      });
    }

    return NextResponse.json({
      id: session.id,
      status: session.status,
      asin: session.asin,
      productTitle: session.productTitle,
      productPrice: session.productPrice,
      productImage: session.productImage,
      checkoutUrl: session.checkoutUrl,
      qrContent: session.qrContent,
      expiresAt: session.expiresAt.toISOString(),
      orderId: session.orderId,
    });
  } catch (error) {
    console.error("Checkout session error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
