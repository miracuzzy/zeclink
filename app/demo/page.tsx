"use client";
import { useState } from "react";
import { useSearch } from "@/lib/demo";
import Link from "next/link";
import PayView, { type PayLink } from "@/components/PayView";
import type { PublicConfig } from "@/lib/types";

// A ready-made demo, so the whole flow can be shown without making a link first.
// Nothing here can be paid: PayView in demo mode never shows a payable QR and makes no payment calls.
const CFG: PublicConfig = { network: "mainnet", ownerHandle: null, ownerLive: false, ownerAddress: null, payeeName: null };

const SAMPLES: Record<"fixed" | "open", PayLink> = {
  fixed: {
    id: "demo-invoice",
    provider: "direct",
    amountZec: "0.25",
    name: "Sam's Studio",
    label: "Logo design",
    memo: "Thanks for your order, INV-0042",
    created: 0,
  },
  open: {
    id: "demo-tips",
    provider: "direct",
    name: "Ada",
    label: "Tips for the stream",
    note: "Thanks for hanging out!",
    suggestions: ["0.05", "0.1", "0.25", "0.5"],
    created: 0,
  },
};

export default function DemoPage() {
  const q = useSearch();
  const [picked, setPicked] = useState<"fixed" | "open" | null>(null);
  const [created] = useState(() => Date.now());
  if (q === null) return <p className="text-center text-zinc-500">Loading…</p>;
  const kind = picked ?? (new URLSearchParams(q).get("amount") === "open" ? "open" : "fixed");

  function pick(k: "fixed" | "open") {
    setPicked(k);
    const u = new URL(window.location.href);
    if (k === "open") u.searchParams.set("amount", "open");
    else u.searchParams.delete("amount");
    window.history.replaceState(null, "", u);
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-md space-y-3 text-center">
        <h1 className="text-2xl font-bold">Try a demo payment</h1>
        <p className="text-sm text-zinc-400">See what paying a ZecLink looks like, start to finish. It&apos;s all pretend, no money moves.</p>
        <div role="group" aria-label="Demo type" className="mx-auto grid max-w-xs grid-cols-2 rounded-xl border border-white/10 bg-black/30 p-1 text-sm">
          {(
            [
              ["fixed", "Fixed amount"],
              ["open", "Any amount"],
            ] as const
          ).map(([k, t]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => pick(k)}
              className={`rounded-lg px-3 py-2 ${kind === k ? "bg-white/10 font-semibold text-white" : "text-zinc-400"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <PayView key={kind} demo cfg={CFG} link={{ ...SAMPLES[kind], created }} />
      <p className="text-center text-sm text-zinc-500">
        Ready for the real thing?{" "}
        <Link href="/new" className="text-zec underline">
          Make a payment link
        </Link>
      </p>
    </div>
  );
}
