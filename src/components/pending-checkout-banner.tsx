"use client";

import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import Link from "next/link";

type PendingSession = {
  id: string;
  asin: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  expiresAt: string;
};

export function PendingCheckoutBanner() {
  const { user } = useUser();
  const [sessions, setSessions] = useState<PendingSession[]>([]);

  useEffect(() => {
    if (!user) return;
    async function fetchPending() {
      try {
        const res = await fetch("/api/checkout/pending");
        if (res.ok) {
          setSessions(await res.json());
        }
      } catch {
        // Silently ignore — banner is non-critical
      }
    }
    fetchPending();
  }, [user]);

  if (sessions.length === 0) return null;

  const latest = sessions[0];
  const remaining = sessions.length - 1;
  const expiresAt = new Date(latest.expiresAt);
  const minutesLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 60_000));

  return (
    <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        {latest.productImage && (
          <img
            src={latest.productImage}
            alt={latest.productTitle}
            className="w-12 h-12 object-contain rounded"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {latest.productTitle}
          </p>
          <p className="text-xs text-gray-500">
            ${latest.productPrice.toFixed(2)} &middot; {minutesLeft}m left
          </p>
        </div>
        <Link
          href={`/pay/${latest.id}`}
          className="shrink-0 px-3 py-1.5 bg-gold text-white text-sm font-medium rounded-lg hover:bg-gold-light"
        >
          Continuar Pago
        </Link>
      </div>
      {remaining > 0 && (
        <Link
          href="/orders"
          className="block mt-2 text-xs text-yellow-700 hover:underline"
        >
          (+{remaining} more pending)
        </Link>
      )}
    </div>
  );
}
