import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mamazon",
  description: "Buy anything online, delivered to your door in Venezuela",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
