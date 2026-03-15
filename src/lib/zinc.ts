import { WAREHOUSE_ADDRESS } from "./warehouse";
import { ZincOrder } from "./types";

export async function createZincOrder(
  asin: string,
  maxPrice: number,
  mamazonOrderId: string
): Promise<ZincOrder> {
  if (process.env.ZINC_MOCK === "true") {
    const mockId = "mock-" + crypto.randomUUID().slice(0, 8);
    return { id: mockId, status: "pending" };
  }

  const apiKey = process.env.ZINC_API_KEY;
  if (!apiKey) throw new Error("ZINC_API_KEY not set");

  const res = await fetch("https://api.zinc.io/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      retailer: "amazon",
      products: [
        {
          product_id: asin,
          quantity: 1,
        },
      ],
      shipping_address: WAREHOUSE_ADDRESS,
      max_price: Math.round(maxPrice * 100),
      is_gift: false,
      shipping: {
        order_by: "price",
        max_days: 7,
      },
      client_notes: {
        mamazon_order_id: mamazonOrderId,
      },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Zinc API error: ${res.status} - ${error}`);
  }

  const data = await res.json();
  return { id: data.request_id, status: "pending" };
}

export async function getZincOrder(orderId: string): Promise<ZincOrder> {
  if (process.env.ZINC_MOCK === "true") {
    return getMockOrderStatus(orderId);
  }

  const apiKey = process.env.ZINC_API_KEY;
  if (!apiKey) throw new Error("ZINC_API_KEY not set");

  const res = await fetch(`https://api.zinc.io/v1/orders/${orderId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Zinc API error: ${res.status} - ${error}`);
  }

  const data = await res.json();

  const rawPrice = data.price_components ?? data.data?.price_components;
  const priceComponents = rawPrice
    ? {
        product_subtotal: rawPrice.subtotal,
        shipping: rawPrice.shipping,
        tax: rawPrice.tax,
        total: rawPrice.total,
      }
    : undefined;

  return {
    id: data.request_id,
    status: data._type === "error" ? "failed" : (data.status ?? "pending"),
    trackingNumbers: data.tracking ?? [],
    priceComponents,
    errorCode: data._type === "error" ? data.code : undefined,
    errorMessage: data._type === "error" ? data.message : undefined,
    shippingAddress: data.request?.shipping_address ?? undefined,
    maxPrice: data.request?.max_price ?? undefined,
    clientNotes: data.request?.client_notes ?? undefined,
  };
}

const ZINC_FEE_CENTS = 100;

export async function estimateZincPrice(asin: string) {
  if (process.env.ZINC_MOCK === "true") {
    return {
      productCents: 1499,
      shippingCents: 0,
      zincFeeCents: ZINC_FEE_CENTS,
      totalCents: 1599,
    };
  }

  const apiKey = process.env.ZINC_API_KEY;
  if (!apiKey) throw new Error("ZINC_API_KEY not set");

  const headers = {
    Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
  };

  const [productRes, offersRes] = await Promise.all([
    fetch(`https://api.zinc.io/v1/products/${asin}?retailer=amazon`, { headers }),
    fetch(`https://api.zinc.io/v1/products/${asin}/offers?retailer=amazon`, { headers }),
  ]);

  if (!productRes.ok) throw new Error("Failed to fetch Zinc product data");

  const product = await productRes.json();
  const productCents: number = product.price;

  let shippingCents = 0;
  if (offersRes.ok) {
    const offersData = await offersRes.json();
    const bestOffer = offersData.offers?.[0];
    if (bestOffer?.shipping_options?.[0]?.price !== undefined) {
      shippingCents = bestOffer.shipping_options[0].price;
    }
  }

  const totalCents = productCents + shippingCents + ZINC_FEE_CENTS;

  return { productCents, shippingCents, zincFeeCents: ZINC_FEE_CENTS, totalCents };
}

const mockCreatedAt = new Map<string, number>();

function getMockOrderStatus(orderId: string): ZincOrder {
  if (!mockCreatedAt.has(orderId)) {
    mockCreatedAt.set(orderId, Date.now());
  }
  const elapsed = Date.now() - mockCreatedAt.get(orderId)!;

  let status = "pending";
  if (elapsed > 60000) status = "delivered";
  else if (elapsed > 45000) status = "shipped";
  else if (elapsed > 20000) status = "order_placed";
  else if (elapsed > 10000) status = "in_progress";

  return {
    id: orderId,
    status,
    trackingNumbers: status === "shipped" || status === "delivered"
      ? ["MOCK1Z999AA10123456784"]
      : [],
  };
}
