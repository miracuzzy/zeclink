"use client";
import { useEffect, useRef, useState } from "react";
import Qr from "./Qr";
import StatusTracker from "./StatusTracker";
import Receipt, { type ReceiptData } from "./Receipt";
import type { PublicStatus, StatusResponse } from "@/lib/types";
import { demoReceiptId, demoTxid } from "@/lib/demo";

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
  /** Demo: told when a simulated payment starts (true) and when the demo is reset (false). */
  onLock?: (locked: boolean) => void;
}

const TERMINAL: PublicStatus[] = ["confirmed", "expired", "cancelled", "refunded"];
// Demo pacing: each step is on screen for about this long.
const STEP_MS = 1500;

export default function PaymentPanel(p: Props) {
  const [status, setStatus] = useState<PublicStatus>("awaiting");
  const [txid, setTxid] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // Demo only: how many of the 4 steps are done, and the receipt id for this run.
  const [demoDone, setDemoDone] = useState(0);
  const [demoId, setDemoId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const statusRef = useRef(status);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Demo: walk through the same steps a real payment goes through. Nothing is sent or checked.
  function simulate() {
    if (!p.demo || simulating) return;
    setSimulating(true);
    setDemoDone(1); // awaiting is over: the "wallet" is sending
    p.onLock?.(true);
    const at = (ms: number, f: () => void) => timers.current.push(setTimeout(f, ms));
    at(STEP_MS, () => {
      setDemoDone(2);
      setStatus("detected");
    });
    at(STEP_MS * 2, () => setDemoDone(3));
    at(STEP_MS * 3, () => {
      setTxid(demoTxid());
      setDemoId(demoReceiptId());
      setPaidAt(new Date().toISOString());
      setDemoDone(4);
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
    setDemoDone(0);
    setStatus("awaiting");
    p.onLock?.(false);
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
  const paid = live && status === "confirmed";
  const fillText = p.memo ? "The amount and memo fill in by themselves." : "The amount fills in by itself.";

  const qrCard = (
    <div className="card flex h-full flex-col justify-center space-y-4">
      {demo ? (
        <Qr value={p.uri} ec="L" label="Demo QR code. It is not a payment request." />
      ) : (
        <a href={p.uri} className="block" aria-label="Open in Zcash wallet">
          <Qr value={p.uri} ec="L" label="Payment QR code with the amount and memo filled in" />
        </a>
      )}
      <p className="text-center text-sm text-zinc-400">
        Scan with your Zcash wallet{p.network === "testnet" ? " (testnet)" : ""}. {fillText}
      </p>
      {demo ? (
        <div className="space-y-2">
          <button type="button" className="btn-primary w-full" onClick={simulate} disabled={simulating || paid} data-testid="simulate">
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
  );

  const receiptData: ReceiptData = {
    ...p.receipt,
    invoiceId: demo ? demoId ?? "DEMO-0000-0000" : p.receipt.invoiceId,
    status,
    txid,
    paidAt: paidAt ?? new Date(0).toISOString(),
    simulated: demo,
    network: p.network,
  };

  return (
    <div className="space-y-5">
      {live ? (
        // The QR card and the receipt share one spot and crossfade, so the page never jumps.
        <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          <div
            className={`transition-opacity duration-500 ${paid ? "pointer-events-none opacity-0" : "opacity-100"}`}
            aria-hidden={paid}
            inert={paid}
          >
            {qrCard}
          </div>
          <div
            className={`transition-opacity duration-500 ${paid ? "opacity-100" : "no-print pointer-events-none opacity-0"}`}
            aria-hidden={!paid}
            inert={!paid}
          >
            <Receipt data={receiptData} printable={paid} />
          </div>
        </div>
      ) : (
        qrCard
      )}

      {live ? (
        <StatusTracker status={status} demo={demo} done={demo ? demoDone : undefined} />
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

      {demo && (
        <button
          type="button"
          className={`btn-ghost w-full transition-opacity duration-500 ${paid ? "opacity-100" : "invisible opacity-0"}`}
          onClick={resetDemo}
          tabIndex={paid ? 0 : -1}
        >
          Run the demo again
        </button>
      )}
    </div>
  );
}
