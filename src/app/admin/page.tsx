"use client";

import { useEffect, useState } from "react";
import { OrderStatus } from "@prisma/client";

type Order = {
  id: string;
  customerEmail: string;
  asin: string;
  productTitle: string;
  productPrice: number;
  status: OrderStatus;
  zincOrderId: string | null;
  createdAt: string;
};

type ZincDetails = {
  id: string;
  status: string;
  trackingNumbers?: string[];
  priceComponents?: {
    product_subtotal?: number;
    shipping?: number;
    tax?: number;
    total?: number;
  };
  errorCode?: string;
  errorMessage?: string;
  shippingAddress?: {
    first_name: string;
    last_name: string;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
  };
  maxPrice?: number;
  clientNotes?: Record<string, string>;
};

type OwcEstimate = {
  shippingCents: number;
  weightLbs: number;
  volumetric: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  created: "bg-gray-100 text-gray-800",
  fulfillment_pending: "bg-blue-100 text-blue-800",
  fulfillment_failed: "bg-red-100 text-red-800",
  ordering_from_amazon: "bg-blue-100 text-blue-800",
  ordered_on_amazon: "bg-blue-100 text-blue-800",
  shipped_to_warehouse: "bg-blue-100 text-blue-800",
  received_at_warehouse: "bg-yellow-100 text-yellow-800",
  shipped_to_venezuela: "bg-yellow-100 text-yellow-800",
  in_transit_venezuela: "bg-yellow-100 text-yellow-800",
  delivered: "bg-green-100 text-green-800",
};

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [zincDetails, setZincDetails] = useState<Record<string, ZincDetails | null>>({});
  const [owcDetails, setOwcDetails] = useState<Record<string, OwcEstimate | null>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  const [unauthorized, setUnauthorized] = useState(false);

  async function fetchOrders() {
    const res = await fetch("/api/admin/orders");
    if (res.status === 403) {
      setUnauthorized(true);
      return;
    }
    const data = await res.json();
    if (Array.isArray(data)) setOrders(data);
  }

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  async function handleRetry(orderId: string) {
    setRetrying(orderId);
    try {
      const res = await fetch("/api/admin/orders/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Retry failed");
        return;
      }
      await fetchOrders();
    } catch {
      alert("Something went wrong");
    } finally {
      setRetrying(null);
    }
  }

  async function toggleDetails(orderId: string) {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }

    setExpandedOrder(orderId);

    if (!zincDetails[orderId]) {
      setLoadingDetails(orderId);
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`);
        const data = await res.json();
        setZincDetails((prev) => ({ ...prev, [orderId]: data.zincDetails }));
        setOwcDetails((prev) => ({ ...prev, [orderId]: data.owcEstimate }));
      } catch {
        setZincDetails((prev) => ({ ...prev, [orderId]: null }));
      } finally {
        setLoadingDetails(null);
      }
    }
  }

  function formatCents(cents: number | undefined) {
    if (cents === undefined) return "\u2014";
    return `$${(cents / 100).toFixed(2)}`;
  }

  if (unauthorized) {
    return (
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin - Orders</h1>
        <p className="text-red-500">Unauthorized. Please sign in with an admin account.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin - Orders</h1>
      {orders.length === 0 ? (
        <p className="text-gray-500">No orders yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Price</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Zinc ID</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
              {orders.map((order) => (
                <tbody key={order.id}>
                  <tr
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleDetails(order.id)}
                  >
                    <td className="p-3 whitespace-nowrap">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">{order.customerEmail}</td>
                    <td className="p-3 max-w-xs truncate" title={order.productTitle}>
                      {order.productTitle}
                    </td>
                    <td className="p-3">${order.productPrice.toFixed(2)}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {order.zincOrderId?.slice(0, 12)}
                    </td>
                    <td className="p-3">
                      {order.status === "fulfillment_failed" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(order.id);
                          }}
                          disabled={retrying === order.id}
                          className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          {retrying === order.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedOrder === order.id && (
                    <tr key={`${order.id}-details`} className="border-b bg-gray-50">
                      <td colSpan={7} className="p-4">
                        {loadingDetails === order.id ? (
                          <p className="text-gray-500 text-sm">Loading details...</p>
                        ) : zincDetails[order.id] ? (
                          <OrderDetails
                            order={order}
                            zinc={zincDetails[order.id]!}
                            owc={owcDetails[order.id] ?? null}
                            formatCents={formatCents}
                          />
                        ) : (
                          <p className="text-gray-500 text-sm">No Zinc details available.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              ))}
          </table>
        </div>
      )}
    </div>
  );
}

function OrderDetails({
  order,
  zinc,
  owc,
  formatCents,
}: {
  order: Order;
  zinc: ZincDetails;
  owc: OwcEstimate | null;
  formatCents: (cents: number | undefined) => string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Order Info</h3>
        <dl className="space-y-1">
          <div className="flex gap-2">
            <dt className="text-gray-500">Order ID:</dt>
            <dd className="font-mono text-xs">{order.id}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">ASIN:</dt>
            <dd>
              <a
                href={`https://www.amazon.com/dp/${order.asin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-600 hover:underline"
              >
                {order.asin}
              </a>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500">Zinc ID:</dt>
            <dd className="font-mono text-xs">{order.zincOrderId}</dd>
          </div>
          {zinc.clientNotes && Object.keys(zinc.clientNotes).length > 0 && (
            <div className="mt-2">
              <dt className="text-gray-500">Client Notes:</dt>
              {Object.entries(zinc.clientNotes).map(([key, value]) => (
                <dd key={key} className="font-mono text-xs">
                  {key}: {value}
                </dd>
              ))}
            </div>
          )}
          {zinc.errorCode && (
            <div className="mt-2 p-2 bg-red-50 rounded">
              <dt className="text-red-700 font-medium">Error: {zinc.errorCode}</dt>
              <dd className="text-red-600 text-xs mt-1">{zinc.errorMessage}</dd>
            </div>
          )}
        </dl>
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Shipping Address</h3>
        {zinc.shippingAddress ? (
          <div className="text-gray-600">
            <p>{zinc.shippingAddress.first_name} {zinc.shippingAddress.last_name}</p>
            <p>{zinc.shippingAddress.address_line1}</p>
            <p>
              {zinc.shippingAddress.city}, {zinc.shippingAddress.state}{" "}
              {zinc.shippingAddress.zip_code}
            </p>
          </div>
        ) : (
          <p className="text-gray-400">Not available</p>
        )}
        {zinc.trackingNumbers && zinc.trackingNumbers.length > 0 && (
          <div className="mt-2">
            <p className="text-gray-500">Tracking:</p>
            {zinc.trackingNumbers.map((t) => (
              <p key={t} className="font-mono text-xs">{t}</p>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-2">Price Breakdown</h3>
        {zinc.priceComponents ? (
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Product:</dt>
              <dd>{formatCents(zinc.priceComponents.product_subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shipping:</dt>
              <dd>{formatCents(zinc.priceComponents.shipping)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax:</dt>
              <dd>{formatCents(zinc.priceComponents.tax)}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <dt>Total (Zinc):</dt>
              <dd>{formatCents(zinc.priceComponents.total)}</dd>
            </div>
            <div className="flex justify-between text-gray-500">
              <dt>Our Price:</dt>
              <dd>${order.productPrice.toFixed(2)}</dd>
            </div>
            {zinc.maxPrice && (
              <div className="flex justify-between text-gray-500">
                <dt>Max Price:</dt>
                <dd>{formatCents(zinc.maxPrice)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <div className="space-y-1">
            <div className="flex justify-between text-gray-500">
              <dt>Our Price:</dt>
              <dd>${order.productPrice.toFixed(2)}</dd>
            </div>
            {zinc.maxPrice && (
              <div className="flex justify-between text-gray-500">
                <dt>Max Price:</dt>
                <dd>{formatCents(zinc.maxPrice)}</dd>
              </div>
            )}
            <p className="text-gray-400 text-xs mt-1">
              Full breakdown available after order completes
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 mb-2">VE Shipping (OWC)</h3>
        {owc ? (
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-gray-500">Weight:</dt>
              <dd>{owc.weightLbs} lb{owc.volumetric ? " (vol.)" : ""}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">OWC Cost:</dt>
              <dd>{formatCents(owc.shippingCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Service Fee:</dt>
              <dd>{formatCents(100)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tax (FL 7%):</dt>
              <dd>{formatCents(Math.ceil(order.productPrice * 7))}</dd>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <dt>Total to Customer:</dt>
              <dd>
                {formatCents(
                  Math.round(order.productPrice * 100) +
                  Math.ceil(order.productPrice * 7) +
                  owc.shippingCents +
                  100
                )}
              </dd>
            </div>
            {zinc.priceComponents?.total && (
              <div className="flex justify-between border-t pt-1 text-xs">
                <dt className="text-gray-500">Our Cost (Zinc + OWC):</dt>
                <dd>
                  {formatCents(zinc.priceComponents.total + owc.shippingCents)}
                </dd>
              </div>
            )}
            {zinc.priceComponents?.total && (
              <div className="flex justify-between text-xs">
                <dt className="text-gray-500">Margin:</dt>
                <dd className={
                  (Math.round(order.productPrice * 100) +
                    Math.ceil(order.productPrice * 7) +
                    owc.shippingCents +
                    100 -
                    zinc.priceComponents.total -
                    owc.shippingCents) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }>
                  {formatCents(
                    Math.round(order.productPrice * 100) +
                    Math.ceil(order.productPrice * 7) +
                    100 -
                    zinc.priceComponents.total
                  )}
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-gray-400 text-xs">
            Weight not available &mdash; cannot estimate
          </p>
        )}
      </div>
    </div>
  );
}
