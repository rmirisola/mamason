"use client";

import { useState } from "react";

export function UrlInput({
  onSubmit,
  loading = false,
}: {
  onSubmit: (url: string) => void;
  loading?: boolean;
}) {
  const [url, setUrl] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim() && !loading) onSubmit(url.trim());
      }}
      className="w-full max-w-xl flex flex-col sm:flex-row gap-3"
    >
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Pega una URL de Amazon..."
        disabled={loading}
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!url.trim() || loading}
        className="px-8 py-3.5 sm:py-3 bg-navy text-white font-bold rounded-lg hover:bg-navy-light disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors whitespace-nowrap shadow-sm hover:shadow-md text-base"
      >
        {loading ? "Buscando..." : "Buscar Producto"}
      </button>
    </form>
  );
}
