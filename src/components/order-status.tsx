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

function getStepIndex(status: OrderStatus): number {
  if (status === "fulfillment_failed") {
    // Internally failed — show as still processing to the customer
    return STEPS.findIndex((s) => s.key === "fulfillment_pending");
  }
  const index = STEPS.findIndex((s) => s.key === status);
  return index >= 0 ? index : 0;
}

export function OrderStatusDisplay({
  productTitle,
  productImage,
  status,
  trackingNumbers,
  deliveryDate,
}: {
  productTitle: string;
  productImage?: string | null;
  status: OrderStatus;
  trackingNumbers: string[];
  deliveryDate?: string | null;
}) {
  const currentIndex = getStepIndex(status);

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

      {deliveryDate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-sm text-blue-800">
            Est. delivery to warehouse:{" "}
            <span className="font-semibold">
              {new Date(deliveryDate).toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          const active = i === currentIndex;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  done
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                } ${active ? "ring-2 ring-green-300" : ""}`}
              >
                {done ? "\u2713" : i + 1}
              </div>
              <span
                className={`text-sm ${
                  done
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
