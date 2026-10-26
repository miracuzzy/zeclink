"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import LinkReady from "@/components/LinkReady";
import { fmtFiat, forgetAddress, loadSavedAddress, saveAddress, useConfig, useRates } from "@/lib/client";
import { checkAddress, networkMismatchText, MAX_LIVE_MEMO_BYTES, MAX_MEMO_BYTES, normaliseZec, utf8ByteLength } from "@/lib/zcash";
import { encodeInvoiceV2, randomId, type InvoicePayload } from "@/lib/payload";
import { walletUri } from "@/lib/walletUri";

export default function NewPaymentLink() {
  const cfg = useConfig();
  const rates = useRates();
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [openAmount, setOpenAmount] = useState(false);
  const [label, setLabel] = useState("");
  const [memo, setMemo] = useState("");
  const [touched, setTouched] = useState(false);
  // Set on submit only, so error lines don't pop in (and shift the form) while someone is still typing.
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  // What the card QR holds: the wallet payment request itself, not the web link.
  const [qr, setQr] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [saved, setSaved] = useState(false);
  // Live tracking with the creator's own CipherPay key is still supported, just hidden
  // from the simple form. Open /new?live to show it.
  const [liveUi, setLiveUi] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  // Prefill the user's own address if they asked this browser to remember it.
  // (Read after mount, so the server-rendered HTML and first client render match.)
  useEffect(() => {
    const t = setTimeout(() => {
      setLiveUi(new URLSearchParams(window.location.search).has("live"));
      const a = loadSavedAddress();
      if (a) {
        setAddress((cur) => cur || a);
        setRemember(true);
        setSaved(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // A new link starts at the top of the page, so the QR and buttons are in view.
  useEffect(() => {
    if (link) window.scrollTo({ top: 0 });
  }, [link]);

  const usesProvider = liveUi && showKey && apiKey.trim().length > 0;
  const addr = useMemo(() => checkAddress(address, cfg?.network), [address, cfg?.network]);
  const netMismatch = addr.ok && cfg && addr.network !== cfg.network;
  const zec = openAmount ? null : normaliseZec(amount);
  const memoBytes = utf8ByteLength(memo.trim());
  const memoLimit = usesProvider ? MAX_LIVE_MEMO_BYTES : MAX_MEMO_BYTES;
  const usd = zec ? fmtFiat(Number(zec), rates?.usd, "USD") : null;

  // Live tracking needs a fixed amount (the key is used once, now).
  const amountOk = openAmount ? !usesProvider : !!zec;
  const valid = amountOk && memoBytes <= memoLimit && (usesProvider || (addr.ok && !netMismatch));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setTried(true);
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
          c: Date.now(),
        };
      } else {
        payload = {
          v: 1,
          k: "inv",
          p: "direct",
          id: randomId(8),
          a: address.trim(),
          z: zec || undefined,
          l: label.trim() || undefined,
          m: memo.trim() || undefined,
          c: Date.now(),
        };
      }
      setApiKey("");
      const uri = walletUri(payload, { compact: true });
      if (!uri) throw new Error("Could not make the payment request");
      setQr(uri);
      setLink(`${window.location.origin}/i/${encodeURIComponent(payload.id)}#${encodeInvoiceV2(payload)}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (link && qr) {
    return (
      <LinkReady
        link={link}
        qr={qr}
        title={label.trim() || undefined}
        zec={openAmount ? null : zec}
        usd={usd}
        note={memo.trim() || undefined}
        onAnother={() => setLink(null)}
      />
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Make a payment link</h1>
        <p className="text-sm text-zinc-400">Get paid in shielded ZEC. No account, no sign up.</p>
      </div>

      {usesProvider ? (
        <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
          With live tracking on, the payment goes to a fresh one-time address in the wallet linked to <b>your</b> CipherPay account.
          The address box is skipped.
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="addr">
            Your address
          </label>
          <textarea
            id="addr"
            className="input min-h-[84px] font-mono text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder={cfg?.network === "testnet" ? "utest1… or ztestsapling1…" : "u1… or zs1…"}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {address && addr.ok && !netMismatch && <p className="hint text-emerald-400">✓ Shielded address, good to go</p>}
          {address && addr.ok && netMismatch && <p className="hint text-red-400">{networkMismatchText(addr.network!)}</p>}
          {(touched || address.length > 3) && address && !addr.ok && <p className="hint text-red-400">{addr.error}</p>}
          {touched && !address && <p className="hint text-red-400">Paste your shielded address.</p>}
          <p className="hint">
            Tip: use a fresh address from your wallet for each link. It still lands in the same wallet, but payers can&apos;t tell your links
            belong to one person. No wallet yet? Try{" "}
            <a className="underline" href="https://zingolabs.org" target="_blank" rel="noopener noreferrer">Zingo</a> or{" "}
            <a className="underline" href="https://zodl.com/download/" target="_blank" rel="noopener noreferrer">Zodl</a>.
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-500">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember on this device
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
        </div>
      )}

      <div>
        <label className="label" htmlFor="amount">
          Amount (ZEC)
        </label>
        {!openAmount && (
          <input
            id="amount"
            className="input font-mono text-lg"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            placeholder="0.25"
          />
        )}
        <p className="hint">
          {openAmount ? (
            usesProvider ? <span className="text-red-400">Live tracking needs a fixed amount.</span> : "The payer types the amount."
          ) : zec && usd ? (
            <>≈ {usd}</>
          ) : amount && !zec ? (
            <span className="text-red-400">Enter a positive amount with at most 8 decimals.</span>
          ) : tried ? (
            <span className="text-red-400">Enter an amount.</span>
          ) : null}
        </p>
        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={openAmount} onChange={(e) => setOpenAmount(e.target.checked)} />
          Let the payer choose the amount
        </label>
      </div>

      <div>
        <label className="label" htmlFor="label">
          What&apos;s it for?
        </label>
        <input id="label" className="input" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Order #12, logo design, ticket…" />
      </div>

      <div>
        <label className="label" htmlFor="memo">
          Note <span className="text-zinc-600">(optional, goes in the private memo)</span>
        </label>
        <textarea id="memo" className="input min-h-[64px]" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="INV-0042" />
        {memoBytes > memoLimit * 0.8 && (
          <p className={`hint ${memoBytes > memoLimit ? "text-red-400" : ""}`}>
            {memoBytes}/{memoLimit} bytes
          </p>
        )}
      </div>

      {liveUi && (
        <details className="rounded-xl border border-white/10 p-3 text-sm" data-testid="advanced" open>
          <summary className="cursor-pointer select-none text-zinc-400">Live tracking</summary>
          <label className="mt-3 flex items-center gap-2 text-zinc-300">
            <input type="checkbox" checked={showKey} onChange={(e) => setShowKey(e.target.checked)} />
            Show when it&apos;s paid (fixed amount only)
          </label>
          {showKey && (
            <div className="mt-3 space-y-2">
              <label className="label" htmlFor="cpkey">
                Your CipherPay API key
              </label>
              <input
                id="cpkey"
                className="input font-mono text-xs"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="cpay_sk_…"
              />
              <p className="hint">
                Used once to set up this payment, then dropped. Never saved or put in the link.{" "}
                <Link href="/privacy" className="underline">More</Link>
              </p>
            </div>
          )}
        </details>
      )}

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
