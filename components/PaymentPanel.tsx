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
  provider: "demo" | "cipherpay";
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

  const simulated = p.provider === "demo";

  return (
    <div className="space-y-5">
      {status !== "confirmed" && (
        <div className="card space-y-4">
          <a href={p.uri} className="block" aria-label="Open in Zcash wallet">
            <Qr value={p.uri} label="ZIP-321 payment request QR code" />
          </a>
          <p className="text-center text-xs text-zinc-500">
            Scan with a shielded Zcash wallet (Zashi/ZODL, Zingo, Ywallet, zkool…) · {p.network}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href={p.uri} className="btn-primary col-span-2 text-center">
              Open in wallet
            </a>
            <CopyButton text={p.uri} label="Copy payment link" />
            <CopyButton text={p.address} label="Copy address" />
            <CopyButton text={p.amountZec} label={`Copy amount`} />
            {p.memo ? <CopyButton text={p.memo} label="Copy memo" /> : <span />}
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

      <StatusTracker status={status} simulated={simulated} />

      {p.provider === "cipherpay" && (
        <p className="text-center text-xs text-zinc-500">
          {err ? err : lastCheck ? `Checking the network every 5s · last check ${new Date(lastCheck).toLocaleTimeString()}` : "Connecting…"}
        </p>
      )}

      {simulated && status !== "confirmed" && (
        <div className="card border-dashed border-amber-400/40">
          <p className="mb-3 text-sm text-amber-200">
            <b>Demo controls.</b> These buttons fake the blockchain so you can preview the flow. They do not move or detect any ZEC.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={status !== "awaiting"} onClick={() => setStatus("detected")}>
              Simulate: payment detected
            </button>
            <button
              className="btn-ghost"
              disabled={status !== "detected"}
              onClick={() => {
                setStatus("confirmed");
                setPaidAt(new Date().toISOString());
              }}
            >
              Simulate: confirmed
            </button>
          </div>
        </div>
      )}

      {status === "confirmed" && (
        <Receipt
          data={{ ...p.receipt, status, txid, paidAt: paidAt ?? new Date().toISOString(), simulated, network: p.network }}
        />
      )}
    </div>
  );
}
