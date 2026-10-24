import { cipherpayBase } from "@/lib/server-config";

export const dynamic = "force-dynamic";

import type { PublicStatus } from "@/lib/types";

function mapStatus(s: string): PublicStatus {
  switch (s) {
    case "pending":
      return "awaiting";
    case "underpaid":
    case "detected":
    case "confirmed":
    case "expired":
    case "refunded":
    case "cancelled":
      return s;
    default:
      return "unknown";
  }
}

/**
 * Proxies CipherPay's public status endpoint (GET /api/invoices/{id}/status needs no API key)
 * so the payer's browser only ever talks to this origin. No key is used or needed here.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  try {
    const res = await fetch(`${cipherpayBase()}/api/invoices/${encodeURIComponent(id)}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return Response.json({ status: "unknown" }, { status: 404 });
    if (!res.ok) return Response.json({ error: "Status unavailable" }, { status: 502 });
    const j = await res.json();
    return Response.json(
      {
        status: mapStatus(String(j.status)),
        txid: j.detected_txid ?? null,
        receivedZat: typeof j.received_zatoshis === "number" ? j.received_zatoshis : null,
        priceZat: typeof j.price_zatoshis === "number" ? j.price_zatoshis : null,
        checkedAt: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Status unavailable" }, { status: 502 });
  }
}
