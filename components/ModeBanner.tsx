"use client";
import type { PublicConfig } from "@/lib/types";

export default function ModeBanner({ cfg, compact = false }: { cfg: PublicConfig | null; compact?: boolean }) {
  if (!cfg) return null;
  if (cfg.provider === "cipherpay") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <span className="font-semibold">Live detection</span> via CipherPay on Zcash <b>{cfg.network}</b>.
        {!compact && " Payment status on this page comes from the Zcash network (mempool + blocks)."}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
      <span className="font-bold tracking-wide text-amber-300">DEMO MODE</span> — payment detection is{" "}
      <b>simulated</b>.{" "}
      {!compact &&
        "The QR code is a real ZIP-321 request to the address entered, but this deployment cannot see payments yet (no CipherPay key configured). Status changes below are triggered by buttons, not by the blockchain."}
    </div>
  );
}
