import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/binance";
import { handlePaymentConfirmed } from "@/lib/payment";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const timestamp = request.headers.get("BinancePay-Timestamp") ?? "";
    const nonce = request.headers.get("BinancePay-Nonce") ?? "";
    const signature = request.headers.get("BinancePay-Signature") ?? "";

    if (!verifyWebhookSignature(timestamp, nonce, body, signature)) {
      return NextResponse.json(
        { returnCode: "FAIL", returnMessage: "Invalid signature" },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    if (data.bizType === "PAY" && data.bizStatus === "PAY_SUCCESS") {
      const merchantTradeNo = data.data?.merchantTradeNo;
      if (merchantTradeNo) {
        const result = await handlePaymentConfirmed(merchantTradeNo, true);
        if (!result.success) {
          return NextResponse.json(
            { returnCode: "FAIL", returnMessage: result.error },
            { status: 400 }
          );
        }
      }
    }

    return NextResponse.json({ returnCode: "SUCCESS", returnMessage: null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook error:", message);
    return NextResponse.json(
      { returnCode: "FAIL", returnMessage: message },
      { status: 500 }
    );
  }
}
