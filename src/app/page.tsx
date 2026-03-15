"use client";

import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/url-input";
import { PendingCheckoutBanner } from "@/components/pending-checkout-banner";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(url: string) {
    setLoading(true);
    setError(null);

    // Extract ASIN and navigate to shareable /buy/[asin] URL
    const match = url.match(
      /(?:\/dp\/|\/gp\/product\/|\/product\/|[?&]asin=)([A-Z0-9]{10})/i
    );
    if (match) {
      router.push(`/buy/${match[1]}`);
      return;
    }

    setError("Could not extract product ID from URL");
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Mamazon</h1>
        <p className="text-lg text-gray-600">
          Buy anything on Amazon, delivered to your door in Venezuela
        </p>
      </div>
      <PendingCheckoutBanner />
      <UrlInput onSubmit={handleSubmit} loading={loading} />
      {loading && <p className="text-gray-500">Fetching product...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
