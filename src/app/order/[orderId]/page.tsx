"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { OrderStatusDisplay } from "@/components/order-status";
import { OrderStatus } from "@prisma/client";

type OrderData = {
  id: string;
  productTitle: string;
  productImage: string | null;
  status: OrderStatus;
  trackingNumbers: string[];
  deliveryDate: string | null;
};

export default function OrderPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/order/${orderId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to fetch order");
          return;
        }
        setOrder(data);
      } catch {
        setError("Something went wrong");
      }
    }

    fetchOrder();

    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!order) {
    return <p className="text-gray-500">Loading order...</p>;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold text-gray-900">Estado del Pedido</h1>
      <OrderStatusDisplay
        productTitle={order.productTitle}
        productImage={order.productImage}
        status={order.status}
        trackingNumbers={order.trackingNumbers}
        deliveryDate={order.deliveryDate}
      />
    </div>
  );
}
