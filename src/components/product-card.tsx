import { useEffect, useState } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { Product } from "@/lib/types";

type Estimate = {
  productCents: number;
  shippingCents: number;
  zincFeeCents: number;
  taxCents?: number;
  owcShippingCents?: number;
  owcWeightLbs?: number;
  owcVolumetric?: boolean;
  totalCents: number;
};

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductCard({
  product,
  onPay,
  onSkipPayment,
  payLoading,
  blocked,
  blockedReason,
}: {
  product: Product;
  onPay: (totalCents: number) => void;
  onSkipPayment?: (totalCents: number) => void;
  payLoading: boolean;
  blocked?: boolean;
  blockedReason?: string;
}) {
  const { user, isLoading: authLoading } = useUser();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateError, setEstimateError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [product.image]);

  useEffect(() => {
    if (blocked || product.price <= 0) return;

    const params = new URLSearchParams({ asin: product.asin });
    if (product.weight) params.set("weight", product.weight);
    if (product.dimensions) params.set("dimensions", product.dimensions);

    fetch(`/api/product/estimate?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setEstimate(data);
        setEstimateError(false);
      })
      .catch(() => setEstimateError(true));
  }, [product.asin, product.weight, product.dimensions, blocked, product.price]);

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden">
      {product.image && (
        <div className="bg-gray-50 p-6 flex justify-center min-h-[200px] items-center">
          {!imageLoaded && (
            <div className="animate-pulse bg-gray-200 rounded w-48 h-48" />
          )}
          <img
            src={product.image}
            alt={product.title}
            className={`max-h-64 object-contain ${imageLoaded ? "" : "hidden"}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}
      <div className="p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {product.title}
        </h2>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">on Amazon</span>
        </div>
        {product.weight && (
          <p className="text-sm text-gray-500">Weight: {product.weight}</p>
        )}
        {estimate && !blocked && (
          <div className="border rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Product</span>
              <span>{formatCents(estimate.productCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amazon shipping</span>
              <span>{estimate.shippingCents === 0 ? "Free" : formatCents(estimate.shippingCents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (FL 7%)</span>
              <span>{formatCents(estimate.taxCents ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Shipping to Venezuela
                {estimate.owcWeightLbs ? ` (${estimate.owcWeightLbs} lb${estimate.owcVolumetric ? ", vol." : ""})` : ""}
              </span>
              <span>{formatCents(estimate.owcShippingCents ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Service fee</span>
              <span>{formatCents(estimate.zincFeeCents)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold text-base">
              <span>Total</span>
              <span>{formatCents(estimate.totalCents)} USD</span>
            </div>
          </div>
        )}
        {!estimate && !blocked && product.price > 0 && !estimateError && (
          <div className="border rounded-lg p-4 space-y-2">
            <div className="animate-pulse bg-gray-200 rounded h-4 w-full" />
            <div className="animate-pulse bg-gray-200 rounded h-4 w-3/4" />
            <div className="animate-pulse bg-gray-200 rounded h-4 w-1/2" />
          </div>
        )}
        {blocked ? (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
            {blockedReason ?? "This product cannot be shipped to Venezuela."}
          </p>
        ) : product.price <= 0 ? (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
            Price unavailable for this product. This may be a grocery, subscription, or region-restricted item. Try a different product.
          </p>
        ) : estimateError ? (
          <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
            Unable to estimate shipping cost — product weight is missing or unrecognized. This product cannot be purchased at this time.
          </p>
        ) : authLoading ? null : !user ? (
          <a
            href={`/auth/login?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}
            className="w-full py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold-light text-center block"
          >
            Inicia sesion para comprar
          </a>
        ) : estimate ? (
          <>
            <button
              disabled
              className="w-full py-3 bg-gray-300 text-gray-500 font-bold rounded-lg cursor-not-allowed"
            >
              Proximamente
            </button>
            {onSkipPayment && (
              <button
                onClick={() => onSkipPayment(estimate.totalCents)}
                disabled={payLoading}
                className="w-full py-2 border border-gray-300 text-gray-500 text-sm rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                Skip Payment (Dev)
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
