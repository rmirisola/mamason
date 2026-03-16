"use client";

import { useState } from "react";

export function UrlInput({
  onSubmit,
  loading = false,
  onValueChange,
}: {
  onSubmit: (url: string) => void;
  loading?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [url, setUrl] = useState("");

  const isAmazonUrl = /amazon\.com|a\.co|amzn\.to|amzn\.com/i.test(url);

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) { setUrl(text.trim()); onValueChange?.(text.trim()); }
    } catch { /* permission denied or not supported */ }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim() && !loading) onSubmit(url.trim());
      }}
      className="w-full max-w-xl flex flex-col gap-2"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); onValueChange?.(e.target.value); }}
            placeholder="Pega una URL de Amazon..."
            disabled={loading}
            className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-navy/60 hover:text-navy border border-navy/20 rounded-md hover:bg-navy/5 transition-colors"
          >
            Pegar
          </button>
        </div>
        <button
          type="submit"
          disabled={!isAmazonUrl || loading}
          className="px-8 py-3.5 sm:py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy-light disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-sm hover:shadow-md text-base"
        >
          {loading ? "Buscando..." : "Buscar Producto"}
        </button>
      </div>
    </form>
  );
}
