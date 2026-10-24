"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ModeBanner from "@/components/ModeBanner";
import CopyButton from "@/components/CopyButton";
import Qr from "@/components/Qr";
import WalletHelp from "@/components/WalletHelp";
import { fmtFiat, forgetAddress, loadSavedAddress, saveAddress, useConfig, useRates } from "@/lib/client";
import { checkAddress, MAX_LIVE_MEMO_BYTES, MAX_MEMO_BYTES, normaliseZec, utf8ByteLength } from "@/lib/zcash";
import { encodePayload, randomId, type InvoicePayload } from "@/lib/payload";

export default function NewPaymentLink() {
  const cfg = useConfig();
  const rates = useRates();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [memo, setMemo] = useState("");
  const [due, setDue] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkLive, setLinkLive] = useState(false);
  const [remember, setRemember] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Prefill the user's own address if they asked this browser to remember it.
  // (Read after mount, so the server-rendered HTML and first client render match.)
  useEffect(() => {
    const t = setTimeout(() => {
      const a = loadSavedAddress();
      if (a) {
        setAddress((cur) => cur || a);
        setRemember(true);
        setSaved(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const usesProvider = showKey && apiKey.trim().length > 0;
  const addr = useMemo(() => checkAddress(address), [address]);
  const netMismatch = addr.ok && cfg && addr.network !== cfg.network;
  const zec = normaliseZec(amount);
  const memoBytes = utf8ByteLength(memo.trim());
  const memoLimit = usesProvider ? MAX_LIVE_MEMO_BYTES : MAX_MEMO_BYTES;
  const usd = zec ? fmtFiat(Number(zec), rates?.usd, "USD") : null;

  // Empty amount = open amount, the payer chooses. Live tracking needs a fixed amount (the key is used once, now).
  const amountOk = amount.trim() === "" ? !usesProvider : !!zec;
  const valid = amountOk && memoBytes <= memoLimit && (usesProvider || (addr.ok && !netMismatch));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErr(null);
    if (!valid || !cfg) return;
    setBusy(true);
    try {
      let payload: InvoicePayload;
      if (!usesProvider && remember) {
        saveAddress(address.trim());
        setSaved(true);
      }
      if (usesProvider) {
        // The key goes to our server for this one request only, so it can ask CipherPay for an
        // invoice. It's never saved, logged or put in the link.
        const res = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "invoice", amountZec: zec, apiKey: apiKey.trim() }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Could not create invoice");
        payload = {
          v: 1,
          k: "inv",
          p: "cipherpay",
          id: j.invoice_id,
          z: String(j.price_zec),
          u: j.zcash_uri,
          pa: j.payment_address,
          e: j.expires_at,
          mc: j.memo_code,
          f: j.fiat,
          l: label.trim() || undefined,
          m: memo.trim() || undefined,
          n: name.trim() || undefined,
          d: due || undefined,
          c: Date.now(),
        };
      } else {
        payload = {
          v: 1,
          k: "inv",
          p: "direct",
          id: randomId(),
          a: address.trim(),
          z: zec || undefined,
          l: label.trim() || undefined,
          m: memo.trim() || undefined,
          n: name.trim() || undefined,
          d: (zec && due) || undefined,
          c: Date.now(),
        };
      }
      setApiKey("");
      setLinkLive(usesProvider);
      setLink(`${window.location.origin}/i/${payload.id}#${encodePayload(payload)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (link) {
    return (
      <div className="mx-auto max-w-md space-y-5">
        <h1 className="text-2xl font-bold">Your payment link is ready</h1>
        <ModeBanner live={linkLive} network={cfg?.network ?? "testnet"} compact />
        <div className="card space-y-4">
          <Qr value={link} size={220} label="QR code of the payment link" />
          <code className="block break-all rounded-lg bg-black/40 p-3 text-xs text-zinc-300">{link}</code>
          <div className="grid grid-cols-2 gap-2">
            <CopyButton text={link} label="Copy link" />
            <a className="btn-ghost" href={link}>
              Open link
            </a>
          </div>
          <p className="text-xs text-zinc-500">
            Everything after the <span className="font-mono">#</span> is the payment request itself. It never reaches our server, so keep
            the link somewhere safe. We can&apos;t get it back for you.
          </p>
        </div>
        <button className="btn-ghost w-full" onClick={() => setLink(null)}>
          Create another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Make a payment link</h1>
        <p className="text-sm text-zinc-400">Get paid in shielded ZEC. Set an amount, or leave it open and let the payer choose.</p>
        <p className="mt-1 text-sm text-zinc-500">All you need is your address. No account, no sign up.</p>
      </div>

      <div>
        <label className="label" htmlFor="name">
          Your name or business <span className="text-zinc-600">(optional)</span>
        </label>
        <input id="name" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name, shop or group" />
      </div>

      {usesProvider ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
          With live tracking on, the payment goes to the wallet linked to <b>your</b> CipherPay account, using a fresh one-time
          address for this payment. The address box is skipped.
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="addr">
            Your shielded receiving address
          </label>
          <textarea
            id="addr"
            className="input min-h-[84px] font-mono text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={cfg?.network === "mainnet" ? "u1… or zs1…" : "utest1… or ztestsapling1…"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {address && addr.ok && !netMismatch && (
            <p className="hint text-emerald-400">
              ✓ Valid {addr.kind === "unified" ? "Unified" : "Sapling"} address ({addr.network})
            </p>
          )}
          {address && addr.ok && netMismatch && (
            <p className="hint text-red-400">
              This is a {addr.network} address but this deployment runs on {cfg?.network}.
            </p>
          )}
          {(touched || address.length > 3) && address && !addr.ok && <p className="hint text-red-400">{addr.error}</p>}
          {touched && !address && <p className="hint text-red-400">Required.</p>}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember my address on this device
            </label>
            {saved && (
              <button
                type="button"
                className="underline"
                onClick={() => {
                  forgetAddress();
                  setSaved(false);
                  setRemember(false);
                }}
              >
                Forget it
              </button>
            )}
          </div>
          <div className="mt-3">
            <WalletHelp />
          </div>
        </div>
      )}

      <div>
        <label className="label" htmlFor="amount">
          Amount (ZEC) <span className="text-zinc-600">(optional)</span>
        </label>
        <input
          id="amount"
          className="input font-mono text-lg"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(",", "."))}
          placeholder="0.25"
        />
        <p className="hint">
          {zec && usd ? (
            <>
              ≈ {usd}
              {cfg?.network === "testnet" && " (at mainnet price, testnet ZEC has no value)"}
            </>
          ) : amount && !zec ? (
            <span className="text-red-400">Enter a positive amount with at most 8 decimals.</span>
          ) : usesProvider ? (
            <span className={touched ? "text-red-400" : ""}>Live tracking needs a fixed amount.</span>
          ) : (
            "Leave it empty to let the payer choose, like a tip or support link."
          )}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="label">
          What&apos;s it for?
        </label>
        <input id="label" className="input" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Order #12, logo design, support my work…" />
      </div>

      <div>
        <label className="label" htmlFor="memo">
          Memo or note <span className="text-zinc-600">(optional, encrypted on-chain)</span>
        </label>
        <textarea id="memo" className="input min-h-[70px]" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="INV-0042" />
        <p className={`hint ${memoBytes > memoLimit ? "text-red-400" : ""}`}>
          {memoBytes}/{memoLimit} bytes
          {usesProvider && " · goes into the encrypted payment memo, never to CipherPay's API"}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="due">
          Due date <span className="text-zinc-600">(optional, only with an amount)</span>
        </label>
        <input id="due" type="date" className="input disabled:opacity-40" disabled={!zec} value={zec ? due : ""} onChange={(e) => setDue(e.target.value)} />
      </div>

      <details className="rounded-xl border border-white/10 p-3 text-sm" data-testid="advanced">
        <summary className="cursor-pointer select-none text-zinc-400">Advanced</summary>
        <p className="hint mt-2">
          Not needed. Turn this on if you want the link to show paid by itself. Only for a fixed amount: we use your key
          once, right now, and never save it, so links where the payer picks the amount are always direct payments.
        </p>
        <label className="mt-3 flex items-center gap-2 text-zinc-300">
          <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} />
          Live tracking
        </label>
        {showKey && (
          <div className="mt-3 space-y-2">
            <label className="label flex items-center justify-between" htmlFor="cpkey">
              <span>Your CipherPay API key</span>
              <a
                href={cfg?.network === "mainnet" ? "https://cipherpay.app" : "https://testnet.cipherpay.app"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-normal text-zinc-400 underline"
              >
                get one
              </a>
            </label>
            <input
              id="cpkey"
              className="input font-mono text-xs"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={cfg?.network === "mainnet" ? "cpay_sk_…" : "cpay_sk_… (testnet key)"}
            />
            <p className="hint">
              The link will show when the payment lands. We use the key once to set up this payment and then drop it. It&apos;s never saved or put in the link.{" "}
              <Link href="/privacy" className="underline">More</Link>
            </p>
          </div>
        )}
      </details>

      {err && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{err}</p>}

      <button className="btn-primary w-full" disabled={busy || !cfg}>
        {busy ? "Creating…" : "Create payment link"}
      </button>
      <p className="text-center text-xs text-zinc-500">
        Nothing is saved on our server. <Link href="/privacy" className="underline">How?</Link>
      </p>
    </form>
  );
}

