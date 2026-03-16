import crypto from "crypto";
import { BinancePayOrder } from "./types";

export async function createPaymentOrder(
  merchantTradeNo: string,
  amount: number,
  productTitle: string,
  sessionId?: string
): Promise<BinancePayOrder> {
  if (process.env.BINANCE_MOCK === "true") {
    return {
      merchantTradeNo,
      checkoutUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/checkout/${sessionId}/mock-pay`,
      qrContent: `mock-payment-${merchantTradeNo}`,
    };
  }

  const apiKey = process.env.BINANCE_API_KEY;
  const secretKey = process.env.BINANCE_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("Binance API keys not set");

  const timestamp = Date.now();
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 32);

  const body = {
    env: { terminalType: "WEB" },
    merchantTradeNo,
    orderAmount: amount.toFixed(2),
    currency: "USDT",
    goods: {
      goodsType: "02",
      goodsCategory: "6000",
      referenceGoodsId: merchantTradeNo,
      goodsName: productTitle.slice(0, 128),
    },
  };

  const payload = `${timestamp}\n${nonce}\n${JSON.stringify(body)}\n`;
  const signature = crypto
    .createHmac("sha512", secretKey)
    .update(payload)
    .digest("hex")
    .toUpperCase();

  const res = await fetch(
    "https://bpay.binanceapi.com/binancepay/openapi/v3/order",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp.toString(),
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": apiKey,
        "BinancePay-Signature": signature,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Binance Pay error: ${res.status} - ${error}`);
  }

  const data = await res.json();

  if (data.status !== "SUCCESS") {
    throw new Error(`Binance Pay error: ${data.code} - ${data.errorMessage}`);
  }

  return {
    merchantTradeNo,
    checkoutUrl: data.data.checkoutUrl,
    qrContent: data.data.qrcodeLink,
  };
}

export function verifyWebhookSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string
): boolean {
  const secretKey = process.env.BINANCE_SECRET_KEY;
  if (!secretKey) return false;

  const payload = `${timestamp}\n${nonce}\n${body}\n`;
  const expected = crypto
    .createHmac("sha512", secretKey)
    .update(payload)
    .digest("hex")
    .toUpperCase();

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
