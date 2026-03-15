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
      className="w-full max-w-xl flex flex-col gap-4"
    >
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste an Amazon product URL..."
        disabled={loading}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!url.trim() || loading}
        className="px-6 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Fetching product..." : "Find Product"}
      </button>
    </form>
  );
}
