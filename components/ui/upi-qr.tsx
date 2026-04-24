"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { X, QrCode } from "lucide-react";

interface UpiQrProps {
  upiId: string;
  payeeName: string;
  amount: number;
  description: string;
  onClose?: () => void;
}

function buildUpiUrl(upiId: string, payeeName: string, amount: number, description: string) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    tn: description,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}

export function UpiQrModal({ upiId, payeeName, amount, description, onClose }: UpiQrProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

  const upiUrl = buildUpiUrl(upiId, payeeName, amount, description);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, upiUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(e => setError(e.message));
  }, [upiUrl]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-xs shadow-2xl flex flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Pay via UPI</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl p-3 shadow-inner">
          {error ? (
            <p className="text-xs text-red-500 w-60 text-center">{error}</p>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold">₹{amount.toLocaleString("en-IN")}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          <p className="text-xs text-muted-foreground mt-1">UPI: {upiId}</p>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">Scan with GPay, PhonePe, Paytm or any UPI app</p>
          <a
            href={upiUrl}
            className="inline-block text-xs text-primary underline"
          >
            Open in UPI app
          </a>
        </div>
      </div>
    </div>
  );
}

interface UpiQrButtonProps {
  upiId?: string | null;
  payeeName: string;
  amount: number;
  description: string;
  size?: "sm" | "md";
}

export function UpiQrButton({ upiId, payeeName, amount, description, size = "sm" }: UpiQrButtonProps) {
  const [open, setOpen] = useState(false);

  if (!upiId) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 rounded-lg font-medium transition-colors bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 ${size === "sm" ? "text-xs px-2.5 py-1.5" : "text-sm px-4 py-2"}`}
      >
        <QrCode className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Pay ₹{amount.toLocaleString("en-IN")}
      </button>
      {open && (
        <UpiQrModal
          upiId={upiId}
          payeeName={payeeName}
          amount={amount}
          description={description}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
