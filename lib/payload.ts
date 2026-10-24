// Invoice / tip-jar data lives in the URL *fragment* (#…). Browsers never send the
// fragment to the server, so the server (and its logs / CDN) never sees the address,
// amount, memo or label. Nothing is stored in a database.
import { base64UrlDecodeBytes, base64UrlEncodeBytes } from "./zcash";

// "direct": pay straight to the creator's own address, no tracking (default).
// "cipherpay": creator's own CipherPay account made this invoice, status is tracked live.
// "owner": tip jar of this deployment's owner, tracked with the server's own CipherPay key.
// "demo": links made by older versions; treated as "direct".
export type ProviderId = "direct" | "cipherpay" | "owner" | "demo";

export interface InvoicePayload {
  v: 1;
  k: "inv";
  p: ProviderId;
  id: string;
  a?: string; // receiving address (direct mode)
  z: string; // amount in ZEC (string, ≤ 8 dp)
  l?: string; // label / what it's for
  m?: string; // memo
  n?: string; // payee display name
  d?: string; // due date (YYYY-MM-DD)
  c: number; // created (unix ms)
  u?: string; // provider-issued ZIP-321 URI (cipherpay)
  pa?: string; // provider-issued payment address (cipherpay)
  e?: string; // provider expiry ISO
  mc?: string; // provider memo code
  f?: { cur: string; amt: number }; // fiat pricing used with provider
}

export interface TipPayload {
  v: 1;
  k: "tip";
  p: ProviderId;
  h: string; // handle
  n?: string; // display name
  b?: string; // bio / thank-you note
  a?: string; // receiving address (direct mode)
  s?: string[]; // suggested amounts in ZEC
}

export function encodePayload(obj: InvoicePayload | TipPayload): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(obj)));
}

export function decodePayload<T extends InvoicePayload | TipPayload>(frag: string, kind: T["k"]): T | null {
  try {
    const raw = frag.startsWith("#") ? frag.slice(1) : frag;
    if (!raw) return null;
    const obj = JSON.parse(new TextDecoder().decode(base64UrlDecodeBytes(raw)));
    if (!obj || obj.v !== 1 || obj.k !== kind) return null;
    return obj as T;
  } catch {
    return null;
  }
}

export function randomId(len = 12): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
