import { Product } from "./types";

type RestrictionResult =
  | { status: "allowed" }
  | { status: "blocked"; reason: string };

export type ProductWithRestriction = Product & {
  restriction: RestrictionResult;
  isPrime: boolean;
};

export async function getProduct(asin: string): Promise<ProductWithRestriction> {
  if (process.env.RAINFOREST_MOCK === "true") {
    return {
      asin,
      title: `Amazon Product (${asin})`,
      price: 49.99,
      currency: "USD",
      image: `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`,
      weight: "1.0 lbs",
      dimensions: "6 x 4 x 3 inches",
      restriction: { status: "allowed" },
      isPrime: true,
    };
  }

  const apiKey = process.env.RAINFOREST_API_KEY;
  if (!apiKey) throw new Error("RAINFOREST_API_KEY not set");

  const params = new URLSearchParams({
    api_key: apiKey,
    type: "product",
    amazon_domain: "amazon.com",
    asin,
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`);
  if (!res.ok) {
    throw new Error(`Rainforest API error: ${res.status}`);
  }

  const data = await res.json();
  const p = data.product;

  const hasBuybox = !!p.buybox_winner;
  const isPrime = p.buybox_winner?.is_prime === true;

  let restriction: RestrictionResult;
  if (!hasBuybox) {
    restriction = { status: "blocked", reason: "Este producto no esta disponible para compra directa en Amazon en este momento." };
  } else if (!isPrime) {
    restriction = { status: "blocked", reason: "Este producto no tiene envio Prime y no puede ser procesado en este momento." };
  } else {
    restriction = { status: "allowed" };
  }

  return {
    asin,
    title: p.title,
    price: p.buybox_winner?.price?.value ?? 0,
    currency: p.buybox_winner?.price?.currency ?? "USD",
    image: p.main_image?.link ?? "",
    weight: p.weight ?? null,
    dimensions: p.dimensions ?? p.specifications?.find((s: { name: string }) => s.name === "Product Dimensions")?.value ?? null,
    restriction,
    isPrime,
  };
}
