"use client";
import type { PublicStatus } from "@/lib/types";

const STEPS: { title: string; sub: string }[] = [
  { title: "Awaiting payment", sub: "Scan the QR with a shielded wallet" },
  { title: "Payment detected", sub: "Seen in the mempool, usually within seconds" },
  { title: "Confirmed", sub: "Mined in a block, about a minute" },
  { title: "Paid", sub: "All done, the receipt is ready" },
];

/** Live payment status. Demo mode uses this exact same view. */
export default function StatusTracker({ status, demo = false }: { status: PublicStatus; demo?: boolean }) {
  // Steps before idx are done. The step at idx is in progress, unless everything is done.
  const idx = status === "confirmed" ? STEPS.length : status === "detected" || status === "underpaid" ? 2 : 0;
  const terminalBad = status === "expired" || status === "cancelled" || status === "refunded";
  return (
    <div className="card" data-testid="status-tracker" data-status={status}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Payment status</h3>
        {demo && <span className="pill border-amber-400/60 text-amber-200">Demo</span>}
      </div>
      {terminalBad ? (
        <p className="text-red-300">This payment request is {status}.</p>
      ) : (
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const done = i < idx;
            const active = i === idx;
            return (
              <li key={s.title} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors duration-500 ${
                    done ? "border-zec bg-zec text-black" : active ? "animate-pulse border-zec text-zec" : "border-zinc-700 text-zinc-600"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div>
                  <p className={done || active ? "font-medium text-zinc-100" : "text-zinc-500"}>{s.title}</p>
                  <p className="text-xs text-zinc-500">{s.sub}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {status === "underpaid" && (
        <p className="mt-3 text-sm text-amber-300">A payment came in, but it&apos;s less than the amount asked for.</p>
      )}
    </div>
  );
}
