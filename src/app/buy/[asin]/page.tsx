"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { UrlInput } from "@/components/url-input";
import { PendingCheckoutBanner } from "@/components/pending-checkout-banner";
import { Product } from "@/lib/types";

export default function BuyPage() {
  const router = useRouter();
  const { asin } = useParams<{ asin: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/admin/orders").then((res) => {
      if (res.ok) setIsAdmin(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(
          `/api/product?url=${encodeURIComponent(`https://www.amazon.com/dp/${asin}`)}`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to fetch product");
          return;
        }

        setProduct(data);
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [asin]);

  async function handlePay(totalCents: number) {
    if (!product) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: product.asin,
          title: product.title,
          price: totalCents / 100,
          image: product.image,
          weight: product.weight,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create checkout");
        return;
      }

      router.push(`/pay/${data.sessionId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSkipPayment(totalCents: number) {
    if (!product) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/dev/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: product.asin,
          title: product.title,
          price: totalCents / 100,
          image: product.image,
          weight: product.weight,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to place order");
        return;
      }

      router.push(`/order/${data.orderId}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  function handleNewUrl(url: string) {
    const match = url.match(
      /(?:\/dp\/|\/gp\/product\/|\/product\/|[?&]asin=)([A-Z0-9]{10})/i
    );
    if (match) {
      router.push(`/buy/${match[1]}`);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <PendingCheckoutBanner />
      <UrlInput onSubmit={handleNewUrl} loading={loading} />
      {loading && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gray-50 p-6 flex justify-center">
            <div className="animate-pulse bg-gray-200 rounded w-48 h-48" />
          </div>
          <div className="p-6 flex flex-col gap-4">
            <div className="animate-pulse bg-gray-200 rounded h-6 w-3/4" />
            <div className="animate-pulse bg-gray-200 rounded h-10 w-1/3" />
          </div>
        </div>
      )}
      {product && (
        <>
          {product.restriction?.status === "flagged" && (
            <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-semibold">Special import requirements</p>
              <p className="text-yellow-600 text-sm mt-1">{product.restriction.reason}</p>
              <p className="text-gray-500 text-xs mt-2">
                This item may require additional processing. Delivery times could be longer.
              </p>
            </div>
          )}
          <ProductCard
            product={product}
            onPay={handlePay}
            onSkipPayment={isAdmin ? handleSkipPayment : undefined}
            payLoading={actionLoading}
            blocked={product.restriction?.status === "blocked"}
            blockedReason={product.restriction?.reason}
          />
        </>
      )}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
