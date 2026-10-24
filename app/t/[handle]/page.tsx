"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import PayView from "@/components/PayView";
import { useConfig, useHash } from "@/lib/client";
import { decodePayload, randomId, type TipPayload } from "@/lib/payload";

// Old tip jar links. They open as an open-amount payment link (the payer chooses the amount).
export default function OldTipJarPage() {
  const { handle } = useParams<{ handle: string }>();
  const hash = useHash();
  const cfg = useConfig();
  const [id] = useState(() => randomId());
  const [created] = useState(() => Date.now());

  if (hash === null || !cfg) return <p className="text-center text-zinc-500">Loading…</p>;
  const tip = decodePayload<TipPayload>(hash, "tip");
  if (!tip || tip.h !== handle) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">Payment link not found</h1>
        <p className="mt-2 text-sm text-zinc-400">This link is incomplete. Ask whoever shared it for the full link.</p>
        <Link href="/new" className="btn-primary mt-4">
          Make your own
        </Link>
      </div>
    );
  }
  return (
    <PayView
      cfg={cfg}
      link={{
        id,
        provider: tip.p === "owner" || tip.p === "cipherpay" ? "owner" : "direct",
        address: tip.a,
        name: tip.n,
        handle: tip.h,
        note: tip.b,
        created,
        suggestions: tip.s,
      }}
    />
  );
}
