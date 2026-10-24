import { cipherpayBase, isCipherpayKey, ownerHandle, ownerKey, zecNetwork } from "@/lib/server-config";
import { getRates } from "@/lib/rates";
import { normaliseZec } from "@/lib/zcash";

export const dynamic = "force-dynamic";

const FIAT = new Set(["USD"]);

/**
 * Creates a CipherPay invoice for live tracking. Two cases only:
 *  - kind "invoice": the creator pasted THEIR OWN CipherPay API key. We use it for this one
 *    request to CipherPay and drop it. It is never stored, logged, returned or put in a link.
 *  - kind "tip" for the deployment owner's own tip jar (ZECLINK_OWNER_HANDLE): uses the
 *    server's key. The server key is never used for anyone else's invoice or tip jar.
 * We send CipherPay NO label, memo, tip message, payee or payer data. Just an amount and a generic name.
 */
export async function POST(req: Request) {
  let body: { kind?: string; amountZec?: string; fiat?: { cur?: string; amt?: number }; apiKey?: unknown; handle?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad JSON" }, { status: 400 });
  }
  const kind = body.kind === "tip" ? "tip" : "invoice";

  let key: string;
  if (kind === "invoice") {
    if (!isCipherpayKey(body.apiKey)) {
      return Response.json({ error: "That doesn't look like a CipherPay API key (it starts with cpay_sk_ or cpay_rk_)." }, { status: 400 });
    }
    key = body.apiKey.trim();
  } else {
    const owner = ownerHandle();
    const k = ownerKey();
    if (!owner || !k || String(body.handle ?? "").toLowerCase() !== owner) {
      return Response.json({ error: "Live tracking isn't set up for this tip jar." }, { status: 409 });
    }
    key = k;
  }

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
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency, product_name: kind === "tip" ? "ZecLink tip" : "ZecLink invoice" }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      return Response.json({ error: `CipherPay didn't accept that API key. Check it's a ${zecNetwork() === "testnet" ? "testnet key" : "key"} from your own CipherPay account.` }, { status: 401 });
    }
    if (!res.ok) {
      return Response.json({ error: `CipherPay error (${res.status})${j?.error ? ": " + String(j.error).slice(0, 200) : ""}` }, { status: 502 });
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
