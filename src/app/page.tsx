"use client";

import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/url-input";
import { PendingCheckoutBanner } from "@/components/pending-checkout-banner";
import { useState } from "react";

const STEPS = [
  {
    step: "1",
    title: "Pega el link",
    desc: "Copia la URL de cualquier producto en Amazon y pegala arriba",
  },
  {
    step: "2",
    title: "Paga",
    desc: "Ve el precio total y paga con USDC o tarjeta (USD)",
  },
  {
    step: "3",
    title: "Te llega",
    desc: "Lo compramos en Amazon y te lo llevamos hasta tu puerta",
  },
];

const VALUE_PROPS = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: "Sin casillero",
    desc: "No necesitas casillero ni intermediarios. Nosotros hacemos todo.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "USDC o tarjeta",
    desc: "Paga con USDC o tarjeta de credito en dolares. Seguro con Stripe.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
    title: "Puerta a puerta",
    desc: "Desde Amazon hasta tu casa en Venezuela. Precio total por adelantado.",
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
    <div className="flex flex-col items-center gap-8 w-full max-w-3xl">
      {/* Hero */}
      <div className="text-center pt-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-navy mb-3 tracking-tight">
          Lo pido, te llega
        </h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto leading-relaxed">
          Compra lo que quieras en Amazon y te lo llevamos a tu puerta en Venezuela.
          Paga con crypto o tarjeta.
        </p>
      </div>

      <PendingCheckoutBanner />

      {/* URL Input */}
      <div className="w-full max-w-xl">
        <UrlInput onSubmit={handleSubmit} loading={loading} />
        {loading && <p className="text-gray-500 text-center mt-3">Buscando producto...</p>}
        {error && <p className="text-red-500 text-center mt-3">{error}</p>}
      </div>

      {/* How it works */}
      <div className="w-full">
        <h2 className="text-lg font-bold text-navy text-center mb-6 uppercase tracking-wide">
          Como funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-11 h-11 rounded-full bg-gold text-white font-bold text-lg flex items-center justify-center mx-auto mb-3 shadow-sm">
                {item.step}
              </div>
              <h3 className="font-semibold text-navy mb-1">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-16 border-t-2 border-gold/30" />

      {/* Value props */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 pb-8">
        {VALUE_PROPS.map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl p-6 text-center border border-gold/10 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-14 h-14 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
              {item.icon}
            </div>
            <h3 className="font-bold text-navy mb-1">{item.title}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
