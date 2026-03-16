"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PaymentQR } from "@/components/payment-qr";

type CheckoutData = {
  id: string;
  status: "pending" | "paid" | "expired";
  asin: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  checkoutUrl: string | null;
  qrContent: string | null;
  expiresAt: string;
  orderId: string | null;
};

export default function PayPage() {
  const router = useRouter();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchCheckout() {
      try {
        const res = await fetch(`/api/checkout/${sessionId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load checkout");
          return;
        }
        setCheckout(data);

        if (data.status === "paid" && data.orderId) {
          router.push(`/order/${data.orderId}`);
          return;
        }
      } catch {
        setError("Something went wrong");
      }
    }

    fetchCheckout();

    const interval = setInterval(fetchCheckout, 3000);
    return () => clearInterval(interval);
  }, [sessionId, router]);

  // Countdown timer
  useEffect(() => {
    if (!checkout?.expiresAt || checkout.status !== "pending") return;

    function updateTimer() {
      const remaining = Math.max(
        0,
        Math.floor((new Date(checkout!.expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [checkout?.expiresAt, checkout?.status]);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!checkout) {
    return <p className="text-gray-500">Loading...</p>;
  }

  if (checkout.status === "expired") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-500 mb-4">
            This checkout session has expired. Please try again.
          </p>
          <button
            onClick={() => router.push(`/buy/${checkout.asin}`)}
            className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : null;
  const seconds = timeLeft !== null ? timeLeft % 60 : null;

  return (
    <div className="flex flex-col items-center gap-4">
      {checkout.checkoutUrl && checkout.qrContent && (
        <PaymentQR
          qrContent={checkout.qrContent}
          checkoutUrl={checkout.checkoutUrl}
          amount={checkout.productPrice}
          isMock={checkout.qrContent.startsWith("mock-")}
          onMockPay={async () => {
            const res = await fetch(`/api/checkout/${sessionId}/mock-pay`, {
              method: "POST",
            });
            if (!res.ok) {
              const data = await res.json();
              setError(data.error || "Mock payment failed");
            }
            // Polling will pick up the status change and redirect
          }}
        />
      )}
      {timeLeft !== null && (
        <p className="text-sm text-gray-500">
          Expires in {minutes}:{String(seconds).padStart(2, "0")}
        </p>
      )}
      <button
        onClick={async () => {
          setCancelling(true);
          try {
            const res = await fetch(`/api/checkout/${sessionId}/cancel`, {
              method: "POST",
            });
            if (res.ok) {
              router.push(`/buy/${checkout.asin}`);
            } else {
              const data = await res.json();
              setError(data.error || "Failed to cancel");
            }
          } catch {
            setError("Something went wrong");
          } finally {
            setCancelling(false);
          }
        }}
        disabled={cancelling}
        className="text-sm text-gray-400 hover:text-gray-600 underline"
      >
        {cancelling ? "Cancelling..." : "Cancel payment"}
      </button>
    </div>
  );
}
