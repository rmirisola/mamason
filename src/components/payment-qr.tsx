"use client";

import { QRCodeSVG } from "qrcode.react";

export function PaymentQR({
  qrContent,
  checkoutUrl,
  amount,
  isMock,
  onMockPay,
}: {
  qrContent: string;
  checkoutUrl: string;
  amount: number;
  isMock?: boolean;
  onMockPay?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-lg shadow-lg max-w-sm">
      <h2 className="text-xl font-bold text-gray-900">Pay with Binance</h2>
      <p className="text-3xl font-bold text-gray-900">
        ${amount.toFixed(2)} <span className="text-sm text-gray-500">USDT</span>
      </p>
      {isMock ? (
        <div className="w-full flex flex-col items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-xs text-gray-400 uppercase font-medium">Dev Mode</p>
          <button
            onClick={onMockPay}
            className="w-full py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300"
          >
            Simulate Payment
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 bg-white rounded-lg border">
            <QRCodeSVG value={qrContent} size={200} />
          </div>
          <p className="text-sm text-gray-500 text-center">
            Scan with Binance app or click below
          </p>
          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-gold text-white font-bold rounded-lg hover:bg-gold-light text-center block"
          >
            Abrir en Binance
          </a>
        </>
      )}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gold rounded-full" />
        Esperando pago...
      </div>
    </div>
  );
}
