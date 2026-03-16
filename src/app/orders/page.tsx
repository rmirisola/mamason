import { auth0 } from "@/lib/auth0";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  created: { label: "Creado", className: "bg-gray-100 text-gray-800" },
  fulfillment_pending: { label: "Procesando", className: "bg-blue-100 text-blue-800" },
  fulfillment_failed: { label: "Procesando", className: "bg-blue-100 text-blue-800" },
  ordering_from_amazon: { label: "Comprando", className: "bg-blue-100 text-blue-800" },
  ordered_on_amazon: { label: "Comprado", className: "bg-blue-100 text-blue-800" },
  shipped_to_warehouse: { label: "Enviado a almacen", className: "bg-blue-100 text-blue-800" },
  received_at_warehouse: { label: "En almacen", className: "bg-yellow-100 text-yellow-800" },
  shipped_to_venezuela: { label: "Enviado a VE", className: "bg-yellow-100 text-yellow-800" },
  in_transit_venezuela: { label: "En camino", className: "bg-yellow-100 text-yellow-800" },
  delivered: { label: "Entregado", className: "bg-green-100 text-green-800" },
};

export default async function OrdersPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { auth0Id: session.user.sub },
    include: {
      orders: { orderBy: { createdAt: "desc" } },
      checkoutSessions: {
        where: { status: "pending", expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const orders = user?.orders ?? [];
  const pendingSessions = user?.checkoutSessions ?? [];

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Pedidos</h1>
      {pendingSessions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Pagos Pendientes</h2>
          <div className="space-y-3">
            {pendingSessions.map((s) => {
              const minutesLeft = Math.max(
                0,
                Math.ceil((new Date(s.expiresAt).getTime() - Date.now()) / 60_000)
              );
              return (
                <Link
                  key={s.id}
                  href={`/pay/${s.id}`}
                  className="block bg-yellow-50 border border-yellow-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    {s.productImage && (
                      <img
                        src={s.productImage}
                        alt={s.productTitle}
                        className="w-16 h-16 object-contain"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {s.productTitle}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${s.productPrice.toFixed(2)} &middot; {minutesLeft}min restantes
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                      Continuar
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No tienes pedidos todavia.</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 bg-gold text-white font-medium rounded-lg hover:bg-gold-light"
          >
            Empezar a Comprar
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? {
              label: order.status,
              className: "bg-gray-100 text-gray-800",
            };
            return (
              <Link
                key={order.id}
                href={`/order/${order.id}`}
                className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  {order.productImage && (
                    <img
                      src={order.productImage}
                      alt={order.productTitle}
                      className="w-16 h-16 object-contain"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.productTitle}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${order.productPrice.toFixed(2)} &middot;{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
