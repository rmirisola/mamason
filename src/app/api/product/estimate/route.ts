import { NextRequest, NextResponse } from "next/server";
import { estimateZincPrice } from "@/lib/zinc";
import { estimateOwcShippingCents } from "@/lib/owc-shipping";

export async function GET(request: NextRequest) {
  const asin = request.nextUrl.searchParams.get("asin");
  const weight = request.nextUrl.searchParams.get("weight");
  const dimensions = request.nextUrl.searchParams.get("dimensions");

  if (!asin) {
    return NextResponse.json({ error: "asin is required" }, { status: 400 });
  }

  try {
    const [zincEstimate, owcEstimate] = await Promise.all([
      estimateZincPrice(asin),
      estimateOwcShippingCents(weight, dimensions),
    ]);

    // Weston, FL (Broward County): 6% state + 1% county = 7%
    const FL_TAX_RATE = 0.07;
    const taxCents = Math.ceil(zincEstimate.productCents * FL_TAX_RATE);

    const totalCents =
      zincEstimate.productCents +
      zincEstimate.shippingCents +
      zincEstimate.zincFeeCents +
      taxCents +
      (owcEstimate?.shippingCents ?? 0);

    return NextResponse.json({
      ...zincEstimate,
      taxCents,
      owcShippingCents: owcEstimate?.shippingCents ?? null,
      owcWeightLbs: owcEstimate?.weightLbs ?? null,
      owcVolumetric: owcEstimate?.volumetric ?? false,
      totalCents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
