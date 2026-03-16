import { NextRequest, NextResponse } from "next/server";
import { handlePaymentConfirmed } from "@/lib/payment";
import { requireAdmin } from "@/lib/admin";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (process.env.BINANCE_MOCK !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { sessionId } = await params;

  const result = await handlePaymentConfirmed(sessionId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, orderId: result.orderId });
}
