"use client";
import { useEffect, useRef, useState } from "react";
import Qr from "./Qr";
import StatusTracker from "./StatusTracker";
import Receipt, { type ReceiptData } from "./Receipt";
import type { PublicStatus, StatusResponse } from "@/lib/types";

interface Props {
  uri: string;
  amountZec: string;
  memo?: string;
  provider: "direct" | "cipherpay";
  network: "testnet" | "mainnet";
  invoiceId: string;
  receipt: Omit<ReceiptData, "status" | "txid" | "paidAt" | "network">;
}

const TERMINAL: PublicStatus[] = ["confirmed", "expired", "cancelled", "refunded"];
const FADE_MS = 500;

export default function PaymentPanel(p: Props) {
  const [status, setStatus] = useState<PublicStatus>("awaiting");
  const [txid, setTxid] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // After a confirmed payment the QR fades out over the receipt, then leaves the page.
  const [qrGone, setQrGone] = useState(false);
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
  const paid = live && status === "confirmed";

  useEffect(() => {
    if (!paid) return;
    const t = setTimeout(() => setQrGone(true), FADE_MS);
    return () => clearTimeout(t);
  }, [paid]);

  const fillText = p.memo ? "The amount and memo fill in by themselves." : "The amount fills in by itself.";
  const qrCard = (
    <div className="card space-y-4">
      <a href={p.uri} className="block" aria-label="Open in Zcash wallet">
        <Qr value={p.uri} ec="L" label="Payment QR code with the amount and memo filled in" />
      </a>
      <p className="text-center text-sm text-zinc-400">
        Scan with your Zcash wallet{p.network === "testnet" ? " (testnet)" : ""}. {fillText}
      </p>
      <a href={p.uri} className="btn-primary w-full text-center">
        Open in wallet
      </a>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* The receipt only exists once the payment is confirmed. It fades in over the QR, which fades
          out (hidden from screen readers) and is then removed, so no gap is left behind. */}
      <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
        {!qrGone && (
          <div className={`transition-opacity duration-500 ${paid ? "pointer-events-none opacity-0" : "opacity-100"}`} aria-hidden={paid || undefined} inert={paid}>
            {qrCard}
          </div>
        )}
        {paid && (
          <div className="fade-in self-start">
            <Receipt data={{ ...p.receipt, status, txid, paidAt: paidAt ?? new Date().toISOString(), network: p.network }} />
          </div>
        )}
      </div>

      {live ? (
        <StatusTracker status={status} />
      ) : (
        <p className="text-center text-xs text-zinc-500">This page can&apos;t see payments. The person you&apos;re paying will see it in their wallet.</p>
      )}

      {live && (
        <p className="text-center text-xs text-zinc-500">
          {err ? err : lastCheck ? `Checking every 5s · last check ${new Date(lastCheck).toLocaleTimeString()}` : "Connecting…"}
        </p>
      )}
    </div>
  );
}
