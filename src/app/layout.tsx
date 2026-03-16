import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lopido — Lo pido, te llega",
  description: "Compra lo que quieras en Amazon y te lo llevamos a tu puerta en Venezuela. Paga con USDC o tarjeta.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <Auth0Provider>
        <body className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="flex flex-col items-center justify-center px-6 py-12">
            {children}
          </main>
        </body>
      </Auth0Provider>
    </html>
  );
}
