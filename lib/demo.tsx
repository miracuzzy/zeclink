"use client";
import { useSyncExternalStore } from "react";

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

export function DemoBadge() {
  return (
    <div className="sticky top-16 z-20 flex justify-center" data-testid="demo-badge">
      <span className="rounded-full border border-amber-400/60 bg-[#1a1405]/95 px-4 py-1.5 text-sm font-semibold text-amber-200 shadow-lg backdrop-blur">
        Demo mode, no real payment
      </span>
    </div>
  );
}
