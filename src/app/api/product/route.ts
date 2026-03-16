import { NextRequest, NextResponse } from "next/server";
import { extractAsin } from "@/lib/asin";
import { getProduct } from "@/lib/rainforest";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  let resolvedUrl = url;

  // Follow redirects for shortened URLs (a.co, amzn.to, etc.)
  if (/^https?:\/\/(a\.co|amzn\.to|amzn\.com)\//i.test(url)) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      resolvedUrl = res.url;
    } catch {
      return NextResponse.json({ error: "No se pudo resolver el link" }, { status: 400 });
    }
  }

  const asin = extractAsin(resolvedUrl);
  if (!asin) {
    return NextResponse.json(
      { error: "No se pudo extraer el producto de esa URL" },
      { status: 400 }
    );
  }

  try {
    const product = await getProduct(asin);
    return NextResponse.json(product);
  } catch (error) {
    console.error("Route error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
