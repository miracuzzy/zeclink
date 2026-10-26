"use client";
import { useEffect, useRef, useState } from "react";
import Qr from "./Qr";
import StatusTracker from "./StatusTracker";
import Receipt, { type ReceiptData } from "./Receipt";
import type { PublicStatus, StatusResponse } from "@/lib/types";
import { demoTxid } from "@/lib/demo";

interface Props {
  uri: string;
  amountZec: string;
  memo?: string;
  provider: "direct" | "cipherpay";
  network: "testnet" | "mainnet";
  invoiceId: string;
  receipt: Omit<ReceiptData, "status" | "txid" | "paidAt" | "simulated" | "network">;
  /** Demo mode: no polling, no network calls, a "Simulate payment" button drives the same status view. */
  demo?: boolean;
  onStatus?: (s: PublicStatus) => void;
}

const TERMINAL: PublicStatus[] = ["confirmed", "expired", "cancelled", "refunded"];

export default function PaymentPanel(p: Props) {
  const [status, setStatus] = useState<PublicStatus>("awaiting");
  const [txid, setTxid] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const statusRef = useRef(status);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onStatus = p.onStatus;
  useEffect(() => {
    statusRef.current = status;
    onStatus?.(status);
  }, [status, onStatus]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Demo: walk through the same steps a real payment goes through. Nothing is sent or checked.
  function simulate() {
    if (!p.demo || simulating) return;
    setSimulating(true);
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    at(1200, () => setStatus("detected"));
    at(4700, () => {
      setTxid(demoTxid());
      setPaidAt(new Date().toISOString());
      setStatus("confirmed");
      setSimulating(false);
    });
  }
  function resetDemo() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setSimulating(false);
    setTxid(null);
    setPaidAt(null);
    setStatus("awaiting");
  }

  // Real detection: poll our own /api/status proxy (never CipherPay directly from the browser).
  useEffect(() => {
    if (p.demo || p.provider !== "cipherpay") return;
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
  }, [p.demo, p.provider, p.invoiceId]);

  const demo = !!p.demo;
  // Demo shows the live tracking view, so it looks exactly like a tracked payment.
  const live = demo || p.provider === "cipherpay";

  return (
    <div className="space-y-5">
      {(!live || status !== "confirmed") && (
        <div className="card space-y-4">
          {demo ? (
            <Qr value={p.uri} ec="L" label="Demo QR code. It is not a payment request." />
          ) : (
            <a href={p.uri} className="block" aria-label="Open in Zcash wallet">
              <Qr value={p.uri} ec="L" label="Payment QR code with the amount and memo filled in" />
            </a>
          )}
          <p className="text-center text-sm text-zinc-400">
            Scan with your Zcash wallet{p.network === "testnet" ? " (testnet)" : ""}. The amount{p.memo ? " and memo" : ""} fill in by themselves.
          </p>
          {demo ? (
            <div className="space-y-2">
              <button type="button" className="btn-primary w-full" onClick={simulate} disabled={simulating} data-testid="simulate">
                {simulating ? "Simulating…" : "Simulate payment"}
              </button>
              <p className="text-center text-xs text-amber-200/80">Demo mode. This QR can&apos;t be paid and nothing is sent.</p>
            </div>
          ) : (
            <a href={p.uri} className="btn-primary w-full text-center">
              Open in wallet
            </a>
          )}
        </div>
      )}

      {live ? (
        <StatusTracker status={status} demo={demo} />
      ) : (
        <p className="text-center text-xs text-zinc-500">This page can&apos;t see payments. The person you&apos;re paying will see it in their wallet.</p>
      )}

      {live && (
        <p className="text-center text-xs text-zinc-500">
          {demo
            ? "Demo mode. Nothing is checked on the network."
            : err
              ? err
              : lastCheck
                ? `Checking every 5s · last check ${new Date(lastCheck).toLocaleTimeString()}`
                : "Connecting…"}
        </p>
      )}

      {live && status === "confirmed" && (
        <Receipt
          data={{ ...p.receipt, status, txid, paidAt: paidAt ?? new Date().toISOString(), simulated: demo, network: p.network }}
        />
      )}

      {demo && status === "confirmed" && (
        <button type="button" className="btn-ghost w-full" onClick={resetDemo}>
          Run the demo again
        </button>
      )}
    </div>
  );
}
