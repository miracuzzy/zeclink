"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

type Ec = "L" | "M" | "Q" | "H";

/**
 * Plain black-on-white QR with a full 4-module quiet zone. No glow or effects around it:
 * phone cameras read it best that way, even off a laptop screen.
 */
export default function Qr({ value, size = 320, label, ec = "M" }: { value: string; size?: number; label?: string; ec?: Ec }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: "svg", errorCorrectionLevel: ec, margin: 4, color: { dark: "#000000", light: "#ffffff" } })
      .then((s) => alive && setSvg(s.replace("<svg ", '<svg shape-rendering="crispEdges" ')))
      .catch(() => alive && setSvg(""));
    return () => {
      alive = false;
    };
  }, [value, ec]);
  return (
    <div
      role="img"
      aria-label={label ?? "Payment QR code"}
      className="mx-auto aspect-square w-full rounded-xl bg-white [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
      style={{ maxWidth: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Save the QR as a PNG, drawn on this device. */
export async function downloadQr(value: string, filename: string, ec: Ec = "M") {
  const url = await QRCode.toDataURL(value, { errorCorrectionLevel: ec, margin: 4, scale: 12, color: { dark: "#000000", light: "#ffffff" } });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
