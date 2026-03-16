import { NextRequest, NextResponse } from "next/server";
import { handlePaymentConfirmed } from "@/lib/payment";
import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (process.env.BINANCE_MOCK !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { sessionId } = await params;

  const session = await prisma.checkoutSession.findUnique({
    where: { id: sessionId },
  });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await handlePaymentConfirmed(sessionId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, orderId: result.orderId });
}
