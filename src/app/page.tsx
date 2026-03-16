"use client";

import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/url-input";
import { PendingCheckoutBanner } from "@/components/pending-checkout-banner";
import { useState } from "react";

const STEPS = [
  { step: "1", title: "Pega el link", desc: "Cualquier producto de Amazon" },
  { step: "2", title: "Ve el precio total", desc: "Producto + envio + impuestos. Sin sorpresas." },
  { step: "3", title: "Paga y te llega", desc: "USDC o tarjeta. Sin casillero. Hasta tu puerta." },
];

const VALUE_PROPS = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: "Sin casillero",
    desc: "Nosotros hacemos todo.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Precio transparente",
    desc: "Sin cargos ocultos.",
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Pago seguro",
    desc: "Procesado por Stripe.",
  },
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(url: string) {
    setLoading(true);
    setError(null);

    const match = url.match(
      /(?:\/dp\/|\/gp\/product\/|\/product\/|[?&]asin=)([A-Z0-9]{10})/i
    );
    if (match) {
      router.push(`/buy/${match[1]}`);
      return;
    }

    setError("No se pudo extraer el producto de esa URL");
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-3xl">
      {/* Hero */}
      <div className="text-center pt-1">
        <img src="/logo-icon.png" alt="Lopido" className="h-12 sm:h-16 mx-auto mb-2 object-contain" />
        <h1 className="text-3xl sm:text-5xl font-bold text-navy mb-2 tracking-tight">
          Lo pido, te llega
        </h1>
        <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto leading-relaxed">
          Pega un link de Amazon, ve el precio total con envio incluido, y te lo llevamos a Venezuela.
        </p>
      </div>

      <PendingCheckoutBanner />

      {/* URL Input + trust signal */}
      <div className="w-full max-w-xl flex flex-col gap-2">
        <UrlInput onSubmit={handleSubmit} loading={loading} />
        {loading && <p className="text-gray-500 text-center text-sm">Buscando producto...</p>}
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}
        <p className="text-xs text-gray-400 text-center">
          Pago seguro con Stripe &middot; Sin casillero &middot; Precio total por adelantado
        </p>
      </div>

      {/* How it works */}
      <div className="w-full pb-6">
        <h2 className="text-xs font-bold text-navy text-center mb-4 uppercase tracking-widest">
          C&oacute;mo funciona
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="bg-white rounded-xl p-3 sm:p-5 text-center border border-gray-100 shadow-sm"
            >
              <div className="w-9 h-9 rounded-full bg-navy text-white font-bold text-sm flex items-center justify-center mx-auto mb-2">
                {item.step}
              </div>
              <h3 className="font-bold text-navy text-xs sm:text-sm mb-0.5">{item.title}</h3>
              <p className="text-[11px] text-gray-400 leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
