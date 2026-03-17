import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not set");
    _stripe = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return _stripe;
}

export async function createCheckoutSession({
  sessionId,
  amount,
  productTitle,
  customerEmail,
}: {
  sessionId: string;
  amount: number;
  productTitle: string;
  customerEmail: string;
}) {
  const stripe = getStripe();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    payment_method_types: ["card", "crypto"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: productTitle.slice(0, 256),
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      lopido_session_id: sessionId,
    },
    success_url: `${baseUrl}/api/checkout/${sessionId}/success?stripe_session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pay/${sessionId}`,
  });

  return {
    checkoutUrl: checkout.url!,
    stripeSessionId: checkout.id,
  };
}
