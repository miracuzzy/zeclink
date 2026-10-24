"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export default function Qr({ value, size = 320, label }: { value: string; size?: number; label?: string }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#0b0b0f", light: "#ffffff" } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(""));
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div
      role="img"
      aria-label={label ?? "Payment QR code"}
      className="mx-auto aspect-square w-full rounded-2xl bg-white p-2 shadow-[0_0_60px_-10px_rgba(244,183,40,0.45)] [&>svg]:h-full [&>svg]:w-full"
      style={{ maxWidth: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
