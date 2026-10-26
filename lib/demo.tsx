"use client";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// Demo mode: shows the whole payment flow without any real money.
// Nothing in demo mode can be paid: the QR holds plain text, not a payment request,
// and the payer page never asks CipherPay for an invoice or a status.
export const DEMO_QR_TEXT = "ZecLink demo. This is not a real payment request, so there is nothing to pay.";

const noSubscribe = () => () => {};

/** The page's ?query string, or null while rendering on the server. */
export function useSearch(): string | null {
  return useSyncExternalStore(noSubscribe, () => window.location.search, () => null);
}

/** True when the page was opened with ?demo (any value). Null until the browser has it. */
export function useDemoParam(): boolean | null {
  const q = useSearch();
  return q === null ? null : new URLSearchParams(q).has("demo");
}

/** A made-up transaction id that can't be mistaken for a real one. */
export function demoTxid(): string {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `demo-${hex}-not-a-real-tx`;
}

/** A receipt number in the same DEMO-XXXX-XXXX format everywhere. */
export function demoReceiptId(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(8));
  const c = Array.from(b, (x) => a[x % a.length]).join("");
  return `DEMO-${c.slice(0, 4)}-${c.slice(4)}`;
}

const getSlot = () => document.getElementById("topbar-slot");

/**
 * "Demo mode, no real payment", as a bar inside the sticky site header. It takes its own
 * space there, so it's always on screen and never covers the page.
 */
export function DemoBadge() {
  const slot = useSyncExternalStore(noSubscribe, getSlot, () => null);
  const bar = (
    <div className="border-t border-amber-400/30 bg-[#1a1405]" data-testid="demo-badge">
      <p className="mx-auto max-w-3xl px-4 py-2 text-center text-sm font-semibold text-amber-200">
        <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-amber-300 align-middle" />
        Demo mode, no real payment
      </p>
    </div>
  );
  return slot ? createPortal(bar, slot) : null;
}
