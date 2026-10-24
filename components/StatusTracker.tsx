"use client";
import type { PublicStatus } from "@/lib/types";

const STEPS: { key: PublicStatus; title: string; sub: string }[] = [
  { key: "awaiting", title: "Awaiting payment", sub: "Scan the QR with a shielded wallet" },
  { key: "detected", title: "Detected", sub: "Seen in the mempool (about 5 to 10s)" },
  { key: "confirmed", title: "Confirmed", sub: "Mined in a block (about 75s)" },
];

export default function StatusTracker({ status }: { status: PublicStatus }) {
  const idx = status === "confirmed" ? 2 : status === "detected" || status === "underpaid" ? 1 : 0;
  const terminalBad = status === "expired" || status === "cancelled" || status === "refunded";
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Payment status</h3>
      </div>
      {terminalBad ? (
        <p className="text-red-300">This payment request is {status}.</p>
      ) : (
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const done = i < idx || (i === idx && status === "confirmed");
            const active = i === idx && status !== "confirmed";
            return (
              <li key={s.key} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                    done
                      ? "border-zec bg-zec text-black"
                      : active
                        ? "border-zec text-zec animate-pulse"
                        : "border-zinc-700 text-zinc-600"
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
        <p className="mt-3 text-sm text-amber-300">A payment was detected but it is less than the amount requested.</p>
      )}
    </div>
  );
}
