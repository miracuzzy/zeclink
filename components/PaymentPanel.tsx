"use client";
import { useEffect, useRef, useState } from "react";
import Qr from "./Qr";
import CopyButton from "./CopyButton";
import StatusTracker from "./StatusTracker";
import Receipt, { type ReceiptData } from "./Receipt";
import type { PublicStatus, StatusResponse } from "@/lib/types";
import { shortAddr } from "@/lib/zcash";

interface Props {
  uri: string;
  address: string;
  amountZec: string;
  memo?: string;
  /** What to call the memo on the copy button: "memo" for invoices, "message" for tips. */
  memoLabel?: "memo" | "message";
  provider: "direct" | "cipherpay";
  network: "testnet" | "mainnet";
  invoiceId: string;
  receipt: Omit<ReceiptData, "status" | "txid" | "paidAt" | "simulated" | "network">;
}

const TERMINAL: PublicStatus[] = ["confirmed", "expired", "cancelled", "refunded"];

export default function PaymentPanel(p: Props) {
  const [status, setStatus] = useState<PublicStatus>("awaiting");
  const [txid, setTxid] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Real detection: poll our own /api/status proxy (never CipherPay directly from the browser).
  useEffect(() => {
    if (p.provider !== "cipherpay") return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/status/${encodeURIComponent(p.invoiceId)}`, { cache: "no-store" });
        const j: StatusResponse | { error: string } = await res.json();
        if (!alive) return;
        if ("status" in j) {
          setErr(null);
          if (j.status !== statusRef.current) {
            setStatus(j.status);
            if (j.status === "confirmed") setPaidAt(new Date().toISOString());
          }
          if (j.txid) setTxid(j.txid);
          setLastCheck(j.checkedAt);
          if (TERMINAL.includes(j.status)) return;
        } else setErr(j.error);
      } catch {
        if (alive) setErr("Network hiccup, retrying…");
      }
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [p.provider, p.invoiceId]);

  const live = p.provider === "cipherpay";
  const [markedSent, setMarkedSent] = useState(false);
  // Some wallet scanners only read a bare address. The simple QR is just the address;
  // the payer then types the amount and pastes the memo themselves.
  const [simple, setSimple] = useState(false);
  const qrValue = simple ? p.address : p.uri;
  const memoWord = p.memoLabel ?? "memo";

  return (
    <div className="space-y-5">
      {(!live || status !== "confirmed") && (
        <div className="card space-y-4">
          <a href={p.uri} className="block" aria-label="Open in Zcash wallet">
            <Qr value={qrValue} label={simple ? "QR code with the receiving address only" : "ZIP-321 payment request QR code"} />
          </a>
          <div role="group" aria-label="QR code type" className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1 text-sm">
            <button
              type="button"
              aria-pressed={!simple}
              onClick={() => setSimple(false)}
              className={`rounded-lg px-3 py-2 ${!simple ? "bg-white/10 font-semibold text-white" : "text-zinc-400"}`}
            >
              Full payment code
            </button>
            <button
              type="button"
              aria-pressed={simple}
              onClick={() => setSimple(true)}
              className={`rounded-lg px-3 py-2 ${simple ? "bg-zec/15 font-semibold text-zec" : "text-zinc-400"}`}
            >
              Simple QR (address only)
            </button>
          </div>
          {simple ? (
            <p className="rounded-lg bg-zec/10 p-3 text-xs text-zinc-300" data-testid="simple-hint">
              This QR has only the address. In your wallet, type <b className="font-mono">{p.amountZec} ZEC</b> exactly
              {p.memo ? <> and paste the {memoWord}</> : null} using the buttons below.
              {live && " It's a one-time address just for this payment, so it still shows as paid."}
            </p>
          ) : (
            <p className="text-center text-xs text-zinc-500">
              Scan with a shielded Zcash wallet (Zodl, Zingo, Ywallet, zkool…){p.network === "testnet" ? " · testnet" : ""}. If your wallet
              can&apos;t read the full code, use the simple QR and paste the amount and {memoWord} yourself.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <a href={p.uri} className="btn-primary col-span-2 text-center">
              Open in wallet
            </a>
            <CopyButton text={p.address} label="Copy address" />
            <CopyButton text={p.amountZec} label="Copy amount" />
            {p.memo ? <CopyButton text={p.memo} label={`Copy ${memoWord}`} /> : null}
            <CopyButton text={p.uri} label="Copy payment link" className={p.memo ? "" : "col-span-2"} />
          </div>
          <details className="text-xs text-zinc-500">
            <summary className="cursor-pointer select-none text-zinc-400">Backup: raw ZIP-321 URI</summary>
            <code className="mt-2 block break-all rounded-lg bg-black/40 p-3 text-[11px] text-zinc-300">{p.uri}</code>
            <p className="mt-2">
              Address: <span className="font-mono">{shortAddr(p.address, 14)}</span>
            </p>
          </details>
        </div>
      )}

      {live ? (
        <StatusTracker status={status} />
      ) : (
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Payment status</h3>
          {!markedSent ? (
            <>
              <p className="text-zinc-200">Waiting for payment.</p>
              <p className="text-sm text-zinc-500">
                This link can&apos;t see the chain, so it won&apos;t update by itself. The person getting paid should check their wallet.
              </p>
              <button className="btn-ghost w-full" onClick={() => setMarkedSent(true)}>
                I&apos;ve sent it
              </button>
            </>
          ) : (
            <>
              <p className="text-zinc-200">You marked this as sent.</p>
              <p className="text-sm text-amber-200/90">
                That&apos;s just your note on this device, not a confirmation. The payment is only done once it shows up in the
                receiver&apos;s wallet.
              </p>
              <button className="btn-ghost w-full" onClick={() => setMarkedSent(false)}>
                Undo
              </button>
            </>
          )}
        </div>
      )}

      {live && (
        <p className="text-center text-xs text-zinc-500">
          {err ? err : lastCheck ? `Checking the network every 5s · last check ${new Date(lastCheck).toLocaleTimeString()}` : "Connecting…"}
        </p>
      )}

      {live && status === "confirmed" && (
        <Receipt
          data={{ ...p.receipt, status, txid, paidAt: paidAt ?? new Date().toISOString(), simulated: false, network: p.network }}
        />
      )}
    </div>
  );
}
