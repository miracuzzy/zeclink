"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import PayView from "@/components/PayView";
import { useConfig, useHash } from "@/lib/client";
import { decodePayload, type InvoicePayload } from "@/lib/payload";

export default function PayLinkPage() {
  const { id } = useParams<{ id: string }>();
  const hash = useHash();
  const cfg = useConfig();

  if (hash === null || !cfg) return <p className="text-center text-zinc-500">Loading…</p>;

  const inv = decodePayload<InvoicePayload>(hash, "inv");
  if (!inv || inv.id !== id) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">Payment link not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          The details live in the part of the link after <span className="font-mono">#</span>. This link is missing a piece, so ask
          the sender to share it again.
        </p>
        <Link href="/new" className="btn-primary mt-4">
          Make your own
        </Link>
      </div>
    );
  }
  const provider = inv.p === "cipherpay" ? "cipherpay" : inv.p === "owner" ? "owner" : "direct";
  // Live (CipherPay) links are always a fixed amount: the invoice was made when the link was.
  const amount = provider === "cipherpay" ? inv.z ?? "" : inv.z;
  return (
    <PayView
      cfg={cfg}
      link={{
        id: inv.id,
        provider,
        address: inv.a,
        amountZec: amount || undefined,
        name: inv.n,
        handle: inv.h,
        label: inv.l,
        memo: inv.m,
        due: inv.d,
        expires: inv.e,
        created: inv.c,
        live: provider === "cipherpay" ? { u: inv.u, pa: inv.pa ?? "", mc: inv.mc } : undefined,
        suggestions: inv.s,
      }}
    />
  );
}
