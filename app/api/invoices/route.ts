import { activeProvider, cipherpayBase } from "@/lib/server-config";
import { getRates } from "@/lib/rates";
import { normaliseZec } from "@/lib/zcash";

export const dynamic = "force-dynamic";

const FIAT = new Set(["USD", "EUR", "GBP"]);

/**
 * Creates a payment request with CipherPay (real detection). Only active when
 * CIPHERPAY_API_KEY is set. We deliberately send CipherPay NO label, memo, payee or
 * payer data — just an amount and a generic product name. Nothing is logged or stored.
 */
export async function POST(req: Request) {
  if (activeProvider() !== "cipherpay") {
    return Response.json({ error: "CipherPay is not configured on this deployment (demo mode)." }, { status: 409 });
  }
  let body: { kind?: string; amountZec?: string; fiat?: { cur?: string; amt?: number } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  const kind = body.kind === "tip" ? "tip" : "invoice";

  let amount: number;
  let currency: string;
  if (body.fiat && typeof body.fiat.amt === "number" && FIAT.has(String(body.fiat.cur))) {
    amount = Math.round(body.fiat.amt * 100) / 100;
    currency = String(body.fiat.cur);
  } else {
    const zec = normaliseZec(String(body.amountZec ?? ""));
    if (!zec) return Response.json({ error: "Invalid ZEC amount" }, { status: 400 });
    const rates = await getRates();
    if (!rates) return Response.json({ error: "Price feed unavailable, try again" }, { status: 503 });
    // CipherPay prices invoices in fiat; convert the requested ZEC amount at the current rate.
    amount = Math.round(Number(zec) * rates.usd * 100) / 100;
    currency = "USD";
  }
  if (!(amount > 0) || amount > 1_000_000) return Response.json({ error: "Amount out of range" }, { status: 400 });

  try {
    const res = await fetch(`${cipherpayBase()}/api/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CIPHERPAY_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency, product_name: kind === "tip" ? "ZecLink tip" : "ZecLink invoice" }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json({ error: `CipherPay error (${res.status})${j?.error ? ": " + String(j.error) : ""}` }, { status: 502 });
    }
    return Response.json(
      {
        invoice_id: j.invoice_id,
        zcash_uri: j.zcash_uri,
        payment_address: j.payment_address,
        price_zec: j.price_zec,
        memo_code: j.memo_code,
        expires_at: j.expires_at,
        fiat: { cur: currency, amt: amount },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "Could not reach CipherPay" }, { status: 502 });
  }
}
