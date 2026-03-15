export type Product = {
  asin: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  weight: string | null;
  dimensions: string | null;
  restriction?: {
    status: "allowed" | "blocked" | "flagged";
    reason?: string;
  };
  isPrime?: boolean;
};

export type BinancePayOrder = {
  merchantTradeNo: string;
  checkoutUrl: string;
  qrContent: string;
};

export type ZincPriceComponents = {
  product_subtotal?: number;
  shipping?: number;
  tax?: number;
  total?: number;
};

export type ZincOrder = {
  id: string;
  status: string;
  trackingNumbers?: string[];
  priceComponents?: ZincPriceComponents;
  errorCode?: string;
  errorMessage?: string;
  shippingAddress?: {
    first_name: string;
    last_name: string;
    address_line1: string;
    city: string;
    state: string;
    zip_code: string;
  };
  maxPrice?: number;
  clientNotes?: Record<string, string>;
};

