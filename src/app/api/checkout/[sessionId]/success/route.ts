import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { handlePaymentConfirmed } from "@/lib/payment";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const stripeSessionId = request.nextUrl.searchParams.get("stripe_session");
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!stripeSessionId) {
    return NextResponse.redirect(`${baseUrl}/pay/${sessionId}`);
  }

  try {
    // Verify the Stripe session is actually paid
    const stripeSession = await getStripe().checkout.sessions.retrieve(stripeSessionId);

    if (
      stripeSession.payment_status === "paid" &&
      stripeSession.metadata?.lopido_session_id === sessionId
    ) {
      const result = await handlePaymentConfirmed(sessionId);
      if (result.success) {
        return NextResponse.redirect(`${baseUrl}/order/${result.orderId}`);
      }
    }

    // Check if webhook already processed it
    const session = await prisma.checkoutSession.findUnique({
      where: { id: sessionId },
    });
    if (session?.status === "paid" && session.orderId) {
      return NextResponse.redirect(`${baseUrl}/order/${session.orderId}`);
    }

    return NextResponse.redirect(`${baseUrl}/pay/${sessionId}`);
  } catch (error) {
    console.error("Stripe success redirect error:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(`${baseUrl}/pay/${sessionId}`);
  }
}
