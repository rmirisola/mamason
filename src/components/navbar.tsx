"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export function Navbar() {
  const { user, isLoading } = useUser();

  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <a href="/" className="text-2xl font-bold text-yellow-600">
        Mamazon
      </a>
      <nav className="flex items-center gap-4 text-sm">
        {isLoading ? null : user ? (
          <>
            <a href="/orders" className="text-gray-600 hover:text-gray-900">
              My Orders
            </a>
            <span className="text-gray-500">{user.email}</span>
            <a
              href="/auth/logout"
              className="px-3 py-1 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100"
            >
              Log Out
            </a>
          </>
        ) : (
          <a
            href="/auth/login"
            className="px-3 py-1 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400"
          >
            Sign In
          </a>
        )}
      </nav>
    </header>
  );
}
