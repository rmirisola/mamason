"use client";

import { OrderStatus } from "@prisma/client";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "created", label: "Order Created" },
  { key: "fulfillment_pending", label: "Processing" },
  { key: "ordering_from_amazon", label: "Ordering from Amazon" },
  { key: "ordered_on_amazon", label: "Ordered on Amazon" },
  { key: "shipped_to_warehouse", label: "Shipped to Warehouse" },
  { key: "received_at_warehouse", label: "Received at Warehouse" },
  { key: "shipped_to_venezuela", label: "Shipped to Venezuela" },
  { key: "in_transit_venezuela", label: "In Transit to Venezuela" },
  { key: "delivered", label: "Delivered" },
];

function getStepInfo(status: OrderStatus): { index: number; failed: boolean } {
  if (status === "fulfillment_failed") {
    // Show at the "Processing" step with failed indicator
    return { index: STEPS.findIndex((s) => s.key === "fulfillment_pending"), failed: true };
  }
  const index = STEPS.findIndex((s) => s.key === status);
  return { index: index >= 0 ? index : 0, failed: false };
}

export function OrderStatusDisplay({
  productTitle,
  productImage,
  status,
  trackingNumbers,
}: {
  productTitle: string;
  productImage?: string | null;
  status: OrderStatus;
  trackingNumbers: string[];
}) {
  const { index: currentIndex, failed } = getStepInfo(status);

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {productImage && (
          <img
            src={productImage}
            alt={productTitle}
            className="w-16 h-16 object-contain rounded"
          />
        )}
        <h2 className="text-lg font-semibold text-gray-900">{productTitle}</h2>
      </div>

      {failed && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">
            There was a problem placing your order. Our team is looking into it.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex && !failed;
          const isFailed = i === currentIndex && failed;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isFailed
                    ? "bg-red-500 text-white"
                    : done
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                } ${active ? "ring-2 ring-green-300" : ""} ${isFailed ? "ring-2 ring-red-300" : ""}`}
              >
                {isFailed ? "!" : done ? "\u2713" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  isFailed
                    ? "text-red-700 font-medium"
                    : done
                      ? "text-gray-900 font-medium"
                      : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
              {active && (
                <div className="animate-spin h-3 w-3 border-2 border-gray-300 border-t-green-500 rounded-full ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {trackingNumbers.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500">Tracking:</p>
          {trackingNumbers.map((tn) => (
            <p key={tn} className="text-sm font-mono text-gray-900">
              {tn}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
