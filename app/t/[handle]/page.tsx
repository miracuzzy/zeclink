"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import ModeBanner from "@/components/ModeBanner";
import PaymentPanel from "@/components/PaymentPanel";
import { fmtFiat, useConfig, useHash, useRates } from "@/lib/client";
import { decodePayload, randomId, type TipPayload } from "@/lib/payload";
import { buildZip321, checkAddress, liveUri, MAX_LIVE_MEMO_BYTES, MAX_MEMO_BYTES, normaliseZec, utf8ByteLength } from "@/lib/zcash";

const now = () => Date.now();

interface Pending {
  id: string;
  uri: string;
  address: string;
  amount: string;
  memo?: string; // full memo the wallet will send (live: "CP-XXXX\n" + message)
  message?: string; // tipper's message only, for the receipt
  createdAt: number;
}

export default function TipPage() {
  const { handle } = useParams<{ handle: string }>();
  const hash = useHash();
  const cfg = useConfig();
  const rates = useRates();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  if (hash === null || !cfg) return <p className="text-center text-zinc-500">Loading…</p>;
  const tip = decodePayload<TipPayload>(hash, "tip");
  if (!tip || tip.h !== handle) {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold">Tip jar not found</h1>
        <p className="mt-2 text-sm text-zinc-400">This link is incomplete. Ask the creator for their full ZecLink.</p>
        <Link href="/tip" className="btn-primary mt-4">
          Make your own
        </Link>
      </div>
    );
  }
  // Live tracking for tip jars only exists for this site owner's own jar (server key). Everyone
  // else's tips go straight to the address in the link.
  const live = tip.p === "owner" && !!cfg.ownerHandle && cfg.ownerHandle === tip.h;
  if ((tip.p === "owner" || tip.p === "cipherpay") && !live) {
    return <div className="card mx-auto max-w-md text-red-300">This tip jar link doesn&apos;t work on this site. Ask the creator for a fresh one.</div>;
  }
  const addrCheck = checkAddress(tip.a ?? "");
  if (!live && !addrCheck.ok) {
    return <div className="card mx-auto max-w-md text-red-300">This tip jar&apos;s address is not a valid shielded address. Do not pay it.</div>;
  }
  const zec = normaliseZec(amount);
  const memoBytes = utf8ByteLength(message.trim());
  const memoLimit = live ? MAX_LIVE_MEMO_BYTES : MAX_MEMO_BYTES;

  async function go() {
    if (!zec || memoBytes > memoLimit) return;
    setErr(null);
    if (!live) {
      const memo = message.trim() || undefined;
      setPending({
        id: randomId(),
        uri: buildZip321({ address: tip!.a!, amount: zec, memo, label: `Tip for @${tip!.h}` }),
        address: tip!.a!,
        amount: zec,
        memo,
        message: memo,
        createdAt: now(),
      });
      return;
    }
    setBusy(true);
    // The message never leaves this browser except inside the wallet's encrypted memo:
    // we only send CipherPay (via our server) the amount, then add the memo to the URI here.
    const text = message.trim() || undefined;
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "tip", amountZec: zec, handle: tip!.h }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not create tip request");
      const amount = String(j.price_zec);
      const built = liveUri({ providerUri: j.zcash_uri, address: j.payment_address, amountZec: amount, memoCode: j.memo_code, text });
      if (!built) throw new Error("Message is too long for a Zcash memo");
      setPending({ id: j.invoice_id, uri: built.uri, address: j.payment_address, amount: built.amount ?? amount, memo: built.memo, message: text, createdAt: now() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-zec/15 text-2xl font-bold text-zec">
          {(tip.n || tip.h).slice(0, 1).toUpperCase()}
        </div>
        <h1 className="text-2xl font-bold">{tip.n || `@${tip.h}`}</h1>
        <p className="text-sm text-zinc-500">@{tip.h}</p>
        {tip.b && <p className="mt-2 text-zinc-300">{tip.b}</p>}
      </div>
      <ModeBanner live={live} network={live ? cfg.network : addrCheck.network!} compact />

      {!pending ? (
        <div className="card space-y-4">
          <p className="text-sm font-medium text-zinc-300">Choose an amount</p>
          {tip.s && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {tip.s.map((s) => (
                <button key={s} type="button" onClick={() => setAmount(s)} className={`btn-ghost font-mono ${amount === s ? "border-zec text-zec" : ""}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <input className="input font-mono" inputMode="decimal" placeholder="Custom amount in ZEC" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} />
          {zec && <p className="hint">≈ {fmtFiat(Number(zec), rates?.usd, "USD")}</p>}
          <div>
            <textarea className="input min-h-[64px]" placeholder="Private message (optional, encrypted in the memo)" value={message} onChange={(e) => setMessage(e.target.value)} />
            <p className={`hint ${memoBytes > memoLimit ? "text-red-400" : ""}`}>
              {memoBytes}/{memoLimit} bytes
              {live && " · stays in your browser and goes only into the encrypted shielded memo"}
            </p>
          </div>
          {err && <p className="text-sm text-red-300">{err}</p>}
          <button className="btn-primary w-full" disabled={!zec || busy || memoBytes > memoLimit} onClick={go}>
            {busy ? "Preparing…" : `Tip ${zec ?? ""} ZEC`}
          </button>
        </div>
      ) : (
        <>
          <PaymentPanel
            key={pending.id}
            uri={pending.uri}
            address={pending.address}
            amountZec={pending.amount}
            memo={pending.memo}
            provider={live ? "cipherpay" : "direct"}
            network={live ? cfg.network : addrCheck.network!}
            invoiceId={pending.id}
            receipt={{
              invoiceId: pending.id,
              payee: tip.n ? `${tip.n} (@${tip.h})` : `@${tip.h}`,
              label: "Tip",
              memo: pending.message,
              amountZec: pending.amount,
              address: pending.address,
              createdAt: pending.createdAt,
              detectedBy: "CipherPay (viewing-key scan of mempool + blocks)",
            }}
          />
          <button className="btn-ghost w-full" onClick={() => setPending(null)}>
            Change amount
          </button>
        </>
      )}
    </div>
  );
}
