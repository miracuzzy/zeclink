"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import ModeBanner from "@/components/ModeBanner";
import NetworkNotice from "@/components/NetworkNotice";
import PaymentPanel from "@/components/PaymentPanel";
import { fmtFiat, useConfig, useHash, useRates } from "@/lib/client";
import { decodePayload, type InvoicePayload } from "@/lib/payload";
import { buildZip321, checkAddress, liveUri } from "@/lib/zcash";

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
          The invoice details live in the part of the link after <span className="font-mono">#</span>. This link is missing a
          piece, so ask the sender to share it again.
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
  // Live mode: CipherPay's URI only carries its memo code, so add the invoice memo here in the
  // browser (memo code first line + memo). The memo comes from the # fragment and is never sent anywhere.
  const live = inv.p === "cipherpay" ? liveUri({ providerUri: inv.u, address, amountZec: inv.z, memoCode: inv.mc, text: inv.m }) : null;
  if (inv.p === "cipherpay" && !live) {
    return <div className="card mx-auto max-w-md text-center text-red-300">This invoice&apos;s memo is too long for a Zcash memo.</div>;
  }
  const uri = live ? live.uri : buildZip321({ address, amount: inv.z, memo: inv.m, label: inv.l || inv.n });
  const payMemo = live ? live.memo : inv.m;
  const payAmount = live?.amount ?? inv.z;
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
            {addrCheck.network === "testnet" && " · testnet"}
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

      <ModeBanner live={inv.p === "cipherpay"} network={addrCheck.network!} compact />
      <NetworkNotice linkNetwork={addrCheck.network!} siteNetwork={cfg.network} />

      <PaymentPanel
        uri={uri}
        address={address}
        amountZec={payAmount}
        memo={payMemo}
        provider={inv.p === "cipherpay" ? "cipherpay" : "direct"}
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
          detectedBy: "CipherPay (viewing-key scan of mempool + blocks)",
        }}
      />
    </div>
  );
}
