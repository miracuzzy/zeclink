"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import ModeBanner from "@/components/ModeBanner";
import PaymentPanel from "@/components/PaymentPanel";
import { fmtFiat, useConfig, useHash, useRates } from "@/lib/client";
import { decodePayload, type InvoicePayload } from "@/lib/payload";
import { buildZip321, checkAddress } from "@/lib/zcash";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const hash = useHash();
  const cfg = useConfig();
  const rates = useRates();

  if (hash === null || !cfg) return <p className="text-center text-zinc-500">Loading…</p>;

  const inv = decodePayload<InvoicePayload>(hash, "inv");
  if (!inv || inv.id !== id) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">Invoice not found</h1>
        <p className="mt-2 text-sm text-zinc-400">
          The invoice details live in the part of the link after <span className="font-mono">#</span>. This link is missing or
          damaged — ask the sender to share it again.
        </p>
        <Link href="/new" className="btn-primary mt-4">
          Create your own
        </Link>
      </div>
    );
  }

  const address = inv.p === "cipherpay" ? inv.pa ?? "" : inv.a ?? "";
  const addrCheck = checkAddress(address);
  if (!addrCheck.ok) {
    return (
      <div className="card mx-auto max-w-md text-center text-red-300">
        This invoice&apos;s receiving address is not a valid shielded address. Do not pay it.
      </div>
    );
  }
  // A link made in demo mode must never be shown as "live", and vice-versa.
  const providerMismatch = inv.p === "cipherpay" && cfg.provider !== "cipherpay";
  const uri = inv.p === "cipherpay" && inv.u ? inv.u : buildZip321({ address, amount: inv.z, memo: inv.m, label: inv.l || inv.n });
  const zecNum = Number(inv.z);
  const usd = fmtFiat(zecNum, rates?.usd, "USD");
  const overdue = inv.d && new Date(inv.d + "T23:59:59") < new Date();

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <p className="text-sm text-zinc-400">{inv.n ? `${inv.n} is requesting` : "Payment request"}</p>
        <p className="mt-1 font-mono text-4xl font-bold text-zec">
          {inv.z} <span className="text-2xl">ZEC</span>
        </p>
        {usd && (
          <p className="text-sm text-zinc-500">
            ≈ {usd}
            {cfg.network === "testnet" && " · testnet"}
          </p>
        )}
        {inv.l && <p className="mt-3 text-lg">{inv.l}</p>}
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          {inv.d && (
            <span className={`pill ${overdue ? "border-red-500/50 text-red-300" : "border-white/15 text-zinc-400"}`}>
              {overdue ? "Overdue · " : "Due "}
              {new Date(inv.d + "T00:00:00").toLocaleDateString()}
            </span>
          )}
          <span className="pill border-white/15 text-zinc-400">
            {addrCheck.kind === "unified" ? "Unified" : "Sapling"} · shielded
          </span>
          {inv.e && <span className="pill border-white/15 text-zinc-400">Expires {new Date(inv.e).toLocaleTimeString()}</span>}
        </div>
        {inv.m && <p className="mt-3 rounded-lg bg-white/[0.03] p-2 text-sm text-zinc-400">Memo: {inv.m}</p>}
      </div>

      {providerMismatch ? (
        <div className="card text-sm text-red-300">
          This invoice was created with live detection, but live detection is not configured on this deployment, so status
          can&apos;t be shown here.
        </div>
      ) : (
        <ModeBanner cfg={{ ...cfg, provider: inv.p }} compact />
      )}

      <PaymentPanel
        uri={uri}
        address={address}
        amountZec={inv.z}
        memo={inv.p === "demo" ? inv.m : undefined}
        provider={providerMismatch ? "demo" : inv.p}
        network={addrCheck.network!}
        invoiceId={inv.id}
        receipt={{
          invoiceId: inv.id,
          payee: inv.n,
          label: inv.l,
          memo: inv.m,
          amountZec: inv.z,
          address,
          createdAt: inv.c,
          detectedBy: inv.p === "cipherpay" ? "CipherPay (viewing-key scan of mempool + blocks)" : "Nothing — simulated in demo mode",
        }}
      />
    </div>
  );
}
