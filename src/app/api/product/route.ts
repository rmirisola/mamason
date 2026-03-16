import { NextRequest, NextResponse } from "next/server";
import { extractAsin } from "@/lib/asin";
import { getProduct } from "@/lib/rainforest";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  const asin = extractAsin(url);
  if (!asin) {
    return NextResponse.json(
      { error: "Could not extract ASIN from URL" },
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
