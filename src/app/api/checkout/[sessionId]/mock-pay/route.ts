import { NextRequest, NextResponse } from "next/server";
import { handlePaymentConfirmed } from "@/lib/payment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (process.env.BINANCE_MOCK !== "true") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { sessionId } = await params;

  const result = await handlePaymentConfirmed(sessionId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.redirect(new URL(`/pay/${sessionId}`, request.url));
}
