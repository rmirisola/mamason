/**
 * One Way Cargo shipping cost estimation.
 * Air service, central region (Caracas, Valencia, Barquisimeto, Maracay).
 * Rates from: https://onewaycargo.net/tarifas
 *
 * Final weight = max(actual weight, volumetric weight)
 * Volumetric weight = (L x W x H in inches) / 166
 */

const OWC_RATE_BS_PER_LB = 3901;
const OWC_HANDLING_BS = 842;
const OWC_DIM_FACTOR = 166;

/**
 * Fetch the current BCV (Banco Central de Venezuela) USD/VES exchange rate.
 * Falls back to a hardcoded estimate if the fetch fails.
 */
async function getBcvRate(): Promise<number> {
  try {
    const res = await fetch("https://pydolarve.org/api/v2/dollar?monitor=bcv", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const rate = data?.price;
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch {
    // fall through to fallback
  }
  // Fallback rate — update periodically
  return 446;
}

/**
 * Parse a weight string like "4.2 ounces", "1.5 pounds", "0.68 kg" into pounds.
 * Returns null if unparseable.
 */
function parseWeightLbs(weight: string | null): number | null {
  if (!weight) return null;

  const cleaned = weight.replace(/[^\d.a-zA-Z\s]/g, "").trim();
  const match = cleaned.match(/([\d.]+)\s*(ounces?|oz|pounds?|lbs?|kilograms?|kg|grams?|g)\b/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (isNaN(value)) return null;

  const unit = match[2].toLowerCase();
  if (unit.startsWith("oz") || unit.startsWith("ounce")) return value / 16;
  if (unit.startsWith("lb") || unit.startsWith("pound")) return value;
  if (unit.startsWith("kg") || unit.startsWith("kilogram")) return value * 2.20462;
  if (unit === "g" || unit.startsWith("gram")) return (value / 1000) * 2.20462;

  return null;
}

/**
 * Parse a dimensions string like '3.5"L x 3.5"W x 2.75"H' or "10 x 5 x 3 inches"
 * into volumetric weight in pounds using OWC's dim factor (166).
 *
 * Since Amazon lists product dimensions (not package), we add:
 *  - 2" padding per side (packaging/box)
 *  - 1.5x volume multiplier (packing material, irregular shapes)
 *
 * Returns null if unparseable.
 */
const PACKAGING_PADDING_INCHES = 0.5;
const VOLUME_FACTOR = 1.5;

function parseDimensionsToVolumetricLbs(dimensions: string | null): number | null {
  if (!dimensions) return null;

  const cleaned = dimensions.replace(/[^\d.x×X\s]/gi, " ").trim();
  const nums = cleaned.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return null;

  const [l, w, h] = nums.slice(0, 3).map(Number);
  if ([l, w, h].some((n) => isNaN(n) || n <= 0)) return null;

  const packageL = l + PACKAGING_PADDING_INCHES * 2;
  const packageW = w + PACKAGING_PADDING_INCHES * 2;
  const packageH = h + PACKAGING_PADDING_INCHES * 2;

  const cubicInches = packageL * packageW * packageH * VOLUME_FACTOR;
  return cubicInches / OWC_DIM_FACTOR;
}

/**
 * Estimate OWC air shipping cost in USD cents.
 * Uses max(actual weight, volumetric weight).
 * Returns null if neither weight nor dimensions can be parsed.
 */
export async function estimateOwcShippingCents(
  weight: string | null,
  dimensions: string | null = null
): Promise<{ shippingCents: number; weightLbs: number; volumetric: boolean } | null> {
  const actualLbs = parseWeightLbs(weight);
  const volumetricLbs = parseDimensionsToVolumetricLbs(dimensions);

  if (actualLbs === null && volumetricLbs === null) return null;

  const finalLbs = Math.max(actualLbs ?? 0, volumetricLbs ?? 0);
  const volumetric = volumetricLbs !== null && volumetricLbs > (actualLbs ?? 0);

  const bcvRate = await getBcvRate();

  const totalBs = finalLbs * OWC_RATE_BS_PER_LB + OWC_HANDLING_BS;
  const totalUsd = totalBs / bcvRate;
  const shippingCents = Math.ceil(totalUsd * 100);

  return {
    shippingCents,
    weightLbs: Math.round(finalLbs * 100) / 100,
    volumetric,
  };
}
