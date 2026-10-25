"use client";
import { useState } from "react";
import NetworkNotice from "@/components/NetworkNotice";
import PaymentPanel from "@/components/PaymentPanel";
import { fmtFiat, useRates } from "@/lib/client";
import type { PublicConfig } from "@/lib/types";
import { buildZip321, checkAddress, liveUri, MAX_LIVE_MEMO_BYTES, MAX_MEMO_BYTES, normaliseZec, utf8ByteLength } from "@/lib/zcash";

/** One payment link, fixed or open amount, from a /i/… link or an old /t/… tip jar link. */
export interface PayLink {
  id: string;
  provider: "direct" | "cipherpay" | "owner";
  address?: string; // direct: the creator's own address
  amountZec?: string; // fixed amount. Missing = the payer chooses
  name?: string;
  handle?: string; // owner link handle (provider "owner")
  label?: string; // what it's for
  note?: string; // short line from the creator (old tip jar bio)
  memo?: string; // creator's memo, goes into the payment memo
  due?: string;
  expires?: string;
  created: number;
  live?: { u?: string; pa: string; mc?: string }; // cipherpay fixed invoice
  suggestions?: string[];
}

const DETECTED_BY = "CipherPay (viewing-key scan of mempool + blocks)";

function Problem({ children }: { children: React.ReactNode }) {
  return <div className="card mx-auto max-w-md text-center text-red-300">{children}</div>;
}

export default function PayView({ link, cfg }: { link: PayLink; cfg: PublicConfig }) {
  const rates = useRates();
  const title = link.name ? `Pay ${link.name}` : link.handle ? `Pay @${link.handle}` : "Payment request";

  const header = (
    <div className="text-center">
      {link.amountZec ? (
        <>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-1 font-mono text-4xl font-bold text-zec">
            {link.amountZec} <span className="text-2xl">ZEC</span>
          </p>
          {fmtFiat(Number(link.amountZec), rates?.usd, "USD") && (
            <p className="text-sm text-zinc-500">≈ {fmtFiat(Number(link.amountZec), rates?.usd, "USD")}</p>
          )}
        </>
      ) : (
        <>
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-zec/15 text-2xl font-bold text-zec">
            {(link.name || link.handle || "Z").slice(0, 1).toUpperCase()}
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {link.handle && link.name && <p className="text-sm text-zinc-500">@{link.handle}</p>}
        </>
      )}
      {link.label && <p className="mt-3 text-lg">{link.label}</p>}
      {link.note && <p className="mt-2 text-zinc-300">{link.note}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
        {link.due && link.amountZec && <DuePill due={link.due} />}
        {link.expires && <span className="pill border-white/15 text-zinc-400">Expires {new Date(link.expires).toLocaleTimeString()}</span>}
      </div>
      {link.memo && <p className="mt-2 text-sm text-zinc-400">{link.memo}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-md space-y-5">
      {header}
      {link.amountZec ? <Fixed link={link} cfg={cfg} /> : <Open link={link} cfg={cfg} />}
    </div>
  );
}

function DuePill({ due }: { due: string }) {
  const overdue = new Date(due + "T23:59:59") < new Date();
  return (
    <span className={`pill ${overdue ? "border-red-500/50 text-red-300" : "border-white/15 text-zinc-400"}`}>
      {overdue ? "Overdue · " : "Due "}
      {new Date(due + "T00:00:00").toLocaleDateString()}
    </span>
  );
}

function Fixed({ link, cfg }: { link: PayLink; cfg: PublicConfig }) {
  const isLive = link.provider === "cipherpay";
  const address = isLive ? link.live?.pa ?? "" : link.address ?? "";
  const addrCheck = checkAddress(address);
  if (!addrCheck.ok) return <Problem>This link&apos;s receiving address is not a valid shielded address. Do not pay it.</Problem>;
  // Live: CipherPay's URI only carries its memo code, so the creator's memo is added here in the browser.
  const live = isLive ? liveUri({ providerUri: link.live?.u, address, amountZec: link.amountZec!, memoCode: link.live?.mc, text: link.memo }) : null;
  if (isLive && !live) return <Problem>This link&apos;s memo is too long for a Zcash memo.</Problem>;
  const uri = live ? live.uri : buildZip321({ address, amount: link.amountZec!, memo: link.memo, label: link.label || link.name });
  const amount = live?.amount ?? link.amountZec!;
  return (
    <>
      <NetworkNotice linkNetwork={addrCheck.network!} siteNetwork={cfg.network} />
      <PaymentPanel
        uri={uri}
        amountZec={amount}
        memo={live ? live.memo : link.memo}
        provider={isLive ? "cipherpay" : "direct"}
        network={isLive ? cfg.network : addrCheck.network!}
        invoiceId={link.id}
        receipt={{ invoiceId: link.id, payee: link.name, label: link.label, memo: link.memo, amountZec: amount, createdAt: link.created, detectedBy: DETECTED_BY }}
      />
    </>
  );
}

interface Pending {
  id: string;
  uri: string;
  address: string;
  amount: string;
  memo?: string;
  message?: string;
  createdAt: number;
}

function Open({ link, cfg }: { link: PayLink; cfg: PublicConfig }) {
  const rates = useRates();
  const [raw, setRaw] = useState("");
  const [cur, setCur] = useState<"ZEC" | "USD">("ZEC");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [liveFailed, setLiveFailed] = useState(false);

  // Live only for this site owner's own link (server key). Everyone else's open links pay straight to their address.
  // The owner's link pays the owner's own address (ZECLINK_OWNER_ADDRESS) directly when there's no key for this
  // network, or if CipherPay errors.
  const ownerLink = link.provider === "owner" && !!cfg.ownerHandle && cfg.ownerHandle === link.handle;
  if (link.provider === "owner" && !ownerLink) return <Problem>This link doesn&apos;t work on this site. Ask whoever shared it for a fresh one.</Problem>;
  const live = ownerLink && cfg.ownerLive && !liveFailed;
  const payTo = ownerLink ? cfg.ownerAddress ?? "" : link.address ?? "";
  if (ownerLink && !live && !payTo) return <Problem>This link isn&apos;t set up on this site right now. Try again later.</Problem>;
  const addrCheck = checkAddress(payTo);
  if (!live && !addrCheck.ok) return <Problem>This link&apos;s receiving address is not a valid shielded address. Do not pay it.</Problem>;

  // The payer can type ZEC or USD; the QR always asks for ZEC.
  const zec =
    cur === "ZEC"
      ? normaliseZec(raw)
      : rates?.usd && Number(raw) > 0
        ? normaliseZec((Number(raw) / rates.usd).toFixed(8))
        : null;
  const other = zec ? (cur === "ZEC" ? fmtFiat(Number(zec), rates?.usd, "USD") : `${zec} ZEC`) : null;
  const text = [link.memo, message.trim()].filter(Boolean).join("\n") || undefined;
  const memoBytes = utf8ByteLength(text ?? "");
  const memoLimit = live ? MAX_LIVE_MEMO_BYTES : MAX_MEMO_BYTES;
  const tooLong = memoBytes > memoLimit;

  // Direct: the payment code follows what the payer types, no extra step.
  const direct: Pending | null =
    !live && zec && !tooLong
      ? {
          id: link.id,
          uri: buildZip321({ address: payTo, amount: zec, memo: text, label: link.label || (link.name ? `Pay ${link.name}` : link.handle ? `Pay @${link.handle}` : undefined) }),
          address: payTo,
          amount: zec,
          memo: text,
          message: text,
          createdAt: link.created,
        }
      : null;
  const shown = live ? pending : direct;

  async function goLive() {
    if (!zec || tooLong) return;
    setErr(null);
    setBusy(true);
    // The message stays in this browser except inside the wallet's encrypted memo:
    // our server only sends CipherPay the amount.
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "tip", amountZec: zec, handle: link.handle }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Could not create the payment request");
      const amount = String(j.price_zec);
      const built = liveUri({ providerUri: j.zcash_uri, address: j.payment_address, amountZec: amount, memoCode: j.memo_code, text });
      if (!built) throw new Error("Message is too long for a Zcash memo");
      setPending({ id: j.invoice_id, uri: built.uri, address: j.payment_address, amount: built.amount ?? amount, memo: built.memo, message: text, createdAt: Date.now() });
    } catch (e) {
      if (ownerLink && cfg.ownerAddress && checkAddress(cfg.ownerAddress).ok) {
        // Live tracking is down: let the payer pay the owner directly instead.
        setLiveFailed(true);
        setErr("Live tracking is down right now, so this payment goes straight to the wallet instead.");
      } else setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!live && <NetworkNotice linkNetwork={addrCheck.network!} siteNetwork={cfg.network} />}
      {!(live && pending) && (
        <div className="card space-y-4">
          <p className="text-sm font-medium text-zinc-300">How much do you want to pay?</p>
          {link.suggestions && link.suggestions.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {link.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setCur("ZEC");
                    setRaw(s);
                  }}
                  className={`btn-ghost font-mono ${cur === "ZEC" && raw === s ? "border-zec text-zec" : ""}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              id="payamount"
              aria-label={`Amount in ${cur}`}
              className="input font-mono text-lg"
              inputMode="decimal"
              placeholder={cur === "ZEC" ? "Amount in ZEC" : "Amount in USD"}
              value={raw}
              onChange={(e) => setRaw(e.target.value.replace(",", "."))}
            />
            <div role="group" aria-label="Currency" className="flex shrink-0 rounded-xl border border-white/10 bg-black/30 p-1 text-sm">
              {(["ZEC", "USD"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={cur === c}
                  disabled={c === "USD" && !rates?.usd}
                  onClick={() => {
                    if (c === cur) return;
                    // Keep the same value when switching, converted.
                    if (zec && rates?.usd) setRaw(c === "USD" ? (Number(zec) * rates.usd).toFixed(2) : zec);
                    setCur(c);
                  }}
                  className={`rounded-lg px-3 ${cur === c ? "bg-white/10 font-semibold text-white" : "text-zinc-400"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <p className="hint">
            {other ? `≈ ${other}` : raw ? <span className="text-red-400">Enter a positive amount.</span> : "You choose the amount."}
          </p>
          <div>
            <textarea
              id="paymsg"
              className="input min-h-[64px]"
              placeholder="Message (optional, private)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {memoBytes > memoLimit * 0.8 && (
              <p className={`hint ${tooLong ? "text-red-400" : ""}`}>
                {memoBytes}/{memoLimit} bytes
              </p>
            )}
          </div>
          {err && <p className="text-sm text-red-300">{err}</p>}
          {live && (
            <button className="btn-primary w-full" disabled={!zec || busy || tooLong} onClick={goLive}>
              {busy ? "Preparing…" : `Pay ${zec ?? ""} ZEC`}
            </button>
          )}
        </div>
      )}
      {shown && (
        <>
          <PaymentPanel
            key={live ? shown.id : "direct"}
            uri={shown.uri}
            amountZec={shown.amount}
            memo={shown.memo}
            provider={live ? "cipherpay" : "direct"}
            network={live ? cfg.network : addrCheck.network!}
            invoiceId={shown.id}
            receipt={{
              invoiceId: shown.id,
              payee: link.name ? (link.handle ? `${link.name} (@${link.handle})` : link.name) : link.handle ? `@${link.handle}` : undefined,
              label: link.label || "Payment",
              memo: shown.message,
              amountZec: shown.amount,
              createdAt: shown.createdAt,
              detectedBy: DETECTED_BY,
            }}
          />
          {live && (
            <button className="btn-ghost w-full" onClick={() => setPending(null)}>
              Change amount
            </button>
          )}
        </>
      )}
    </>
  );
}
