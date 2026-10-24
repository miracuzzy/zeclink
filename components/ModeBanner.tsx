"use client";

/** Honest one-liner about whether this page can see the payment. */
export default function ModeBanner({ live, network, compact = false }: { live: boolean; network: "testnet" | "mainnet"; compact?: boolean }) {
  if (live) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <span className="font-semibold">Live tracking</span> on Zcash <b>{network}</b>.
        {!compact && " This page watches the network and updates by itself when the payment lands."}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
      <span className="font-semibold">Direct payment</span> on Zcash <b>{network}</b>.
      {!compact && " Money goes straight to the address in this link. This page can't see the chain, so the wallet is the place to check."}
    </div>
  );
}
