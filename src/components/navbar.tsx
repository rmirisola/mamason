"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export function Navbar() {
  const { user, isLoading } = useUser();

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <a href="/" className="flex items-center gap-2">
        <img src="/logo-icon.png" alt="" className="h-9 object-contain" />
        <span className="text-2xl font-bold text-navy">Lopido</span>
      </a>
      <nav className="flex items-center gap-4 text-sm">
        {isLoading ? null : user ? (
          <>
            <a href="/orders" className="text-gray-600 hover:text-gray-900">
              Mis Pedidos
            </a>
            <span className="text-gray-500">{user.email}</span>
            <a
              href="/auth/logout"
              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Salir
            </a>
          </>
        ) : (
          <a
            href="/auth/login"
            className="px-4 py-1.5 border border-navy text-navy font-medium rounded-lg hover:bg-navy hover:text-white transition-colors"
          >
            Entrar
          </a>
        )}
      </nav>
    </header>
  );
}
