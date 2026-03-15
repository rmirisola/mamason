import { NextRequest, NextResponse } from "next/server";
import { estimateOwcShippingCents } from "@/lib/owc-shipping";

export async function GET(request: NextRequest) {
  const weight = request.nextUrl.searchParams.get("weight");
  const dimensions = request.nextUrl.searchParams.get("dimensions");

  try {
    const estimate = await estimateOwcShippingCents(weight, dimensions);
    if (!estimate) {
      return NextResponse.json({ error: "Could not parse weight or dimensions" }, { status: 400 });
    }
    return NextResponse.json(estimate);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
