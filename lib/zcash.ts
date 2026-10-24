// Zcash address validation + ZIP-321 payment URI helpers.
// Runs entirely in the browser (and server); no network calls.

export type Network = "mainnet" | "testnet";
export type AddressKind = "unified" | "sapling";

export interface AddressCheck {
  ok: boolean;
  kind?: AddressKind;
  network?: Network;
  error?: string;
}

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

function polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = (((chk & 0x1ffffff) << 5) ^ v) >>> 0;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk = (chk ^ GEN[i]) >>> 0;
  }
  return chk;
}

function hrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}

/** Returns the checksum variant ("bech32" | "bech32m") or null if invalid. No length limit (UAs are long). */
function bech32Verify(str: string): { hrp: string; variant: "bech32" | "bech32m"; dataLen: number } | null {
  if (str !== str.toLowerCase() && str !== str.toUpperCase()) return null;
  const s = str.toLowerCase();
  const pos = s.lastIndexOf("1");
  if (pos < 1 || pos + 7 > s.length) return null;
  const hrp = s.slice(0, pos);
  const data: number[] = [];
  for (const c of s.slice(pos + 1)) {
    const d = CHARSET.indexOf(c);
    if (d === -1) return null;
    data.push(d);
  }
  const pm = polymod([...hrpExpand(hrp), ...data]);
  if (pm === BECH32_CONST) return { hrp, variant: "bech32", dataLen: data.length - 6 };
  if (pm === BECH32M_CONST) return { hrp, variant: "bech32m", dataLen: data.length - 6 };
  return null;
}

/**
 * Accept ONLY shielded addresses:
 *  - Unified addresses (u1… mainnet / utest1… testnet, bech32m). ZIP-316 requires a UA to carry a shielded receiver.
 *  - Sapling addresses (zs1… mainnet / ztestsapling1… testnet, bech32).
 * Transparent (t1/t3/tm/t2), TEX (tex1/textest1) and legacy Sprout (zc/zt) addresses are rejected.
 */
export function checkAddress(raw: string, expect?: Network): AddressCheck {
  const ua = expect === "mainnet" ? "u1…" : expect === "testnet" ? "utest1…" : "u1… / utest1…";
  const sap = expect === "mainnet" ? "zs1…" : expect === "testnet" ? "ztestsapling1…" : "zs1… / ztestsapling1…";
  const addr = raw.trim();
  if (!addr) return { ok: false, error: "Enter a shielded Zcash address." };
  const lower = addr.toLowerCase();
  if (/^t[1-3m]/i.test(addr) || lower.startsWith("tex1") || lower.startsWith("textest1")) {
    return {
      ok: false,
      error: "That is a transparent address. Transparent payments are public on-chain. ZecLink only accepts shielded (Unified or Sapling) addresses.",
    };
  }
  if (/^z[ct][0-9a-z]/i.test(addr) && !lower.startsWith("zs1") && !lower.startsWith("ztestsapling1")) {
    return { ok: false, error: `Legacy Sprout addresses are not supported. Use a Unified (${ua}) or Sapling (${sap}) address.` };
  }
  const dec = bech32Verify(addr);
  if (!dec) return { ok: false, error: "That doesn't look like a valid address (checksum failed). Copy it again from your wallet." };
  switch (dec.hrp) {
    case "u":
      return dec.variant === "bech32m" ? { ok: true, kind: "unified", network: "mainnet" } : bad();
    case "utest":
      return dec.variant === "bech32m" ? { ok: true, kind: "unified", network: "testnet" } : bad();
    case "zs":
      return dec.variant === "bech32" ? { ok: true, kind: "sapling", network: "mainnet" } : bad();
    case "ztestsapling":
      return dec.variant === "bech32" ? { ok: true, kind: "sapling", network: "testnet" } : bad();
    default:
      return { ok: false, error: `Unrecognised address type. Use a Unified (${ua}) or Sapling (${sap}) address.` };
  }
  function bad(): AddressCheck {
    return { ok: false, error: "Address checksum variant is wrong for this address type." };
  }
}

/** Normalise a ZEC amount string to at most 8 decimals, no trailing zeros. Returns null if invalid. */
export function normaliseZec(input: string): string | null {
  const s = input.trim();
  if (!/^\d{1,8}(\.\d{1,8})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  const int = String(BigInt(i));
  const frac = f.replace(/0+$/, "");
  const out = frac ? `${int}.${frac}` : int;
  if (out === "0") return null;
  if (BigInt(int) > BigInt(21_000_000)) return null;
  return out;
}

export function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecodeBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// RFC 3986 "qchar" encoding for ZIP-321 label/message.
function qchar(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export const MAX_MEMO_BYTES = 512;

/** Build a ZIP-321 payment request URI. Memo is base64url (no padding), shielded recipients only. */
export function buildZip321(opts: { address: string; amount?: string; memo?: string; label?: string; message?: string }): string {
  const params: string[] = [];
  if (opts.amount) params.push(`amount=${opts.amount}`);
  if (opts.memo) params.push(`memo=${base64UrlEncodeBytes(new TextEncoder().encode(opts.memo))}`);
  if (opts.label) params.push(`label=${qchar(opts.label)}`);
  if (opts.message) params.push(`message=${qchar(opts.message)}`);
  return `zcash:${opts.address}${params.length ? "?" + params.join("&") : ""}`;
}

export function shortAddr(a: string, n = 10): string {
  return a.length <= n * 2 + 1 ? a : `${a.slice(0, n)}…${a.slice(-n)}`;
}

// ---------------------------------------------------------------------------
// Live (CipherPay) mode: carrying the user's private memo.
//
// CipherPay returns a ready-made ZIP-321 URI whose memo is only its reference code
// (e.g. "CP-1A2B3C4D"). CipherPay matches payments by the invoice's unique diversified
// address first; the memo code is only a fallback for legacy invoices
// (cipherpay-api src/invoices/matching.rs). So we can safely put our own memo in the
// URI — built here, in the browser — as long as the address and amount stay untouched.
// We keep the memo code as the first line anyway, for that fallback and for the
// recipient's own reconciliation.
// ---------------------------------------------------------------------------

/** Bytes reserved for the provider memo code + newline ("CP-XXXXXXXX\n" = 12 bytes; rounded up). */
export const PROVIDER_MEMO_RESERVE = 16;
/** Max bytes of user text when the memo also has to carry a provider memo code. */
export const MAX_LIVE_MEMO_BYTES = MAX_MEMO_BYTES - PROVIDER_MEMO_RESERVE;

/** "CP-XXXX\n<text>" (or just one of them). Returns null if the result would exceed 512 bytes. */
export function composeMemo(memoCode: string | undefined, text: string | undefined): string | null | undefined {
  const t = text?.trim() || "";
  const c = memoCode?.trim() || "";
  const memo = c && t ? `${c}\n${t}` : c || t;
  if (!memo) return undefined;
  return utf8ByteLength(memo) <= MAX_MEMO_BYTES ? memo : null;
}

export interface Zip321Primary {
  address: string;
  amount?: string;
  memo?: string; // decoded UTF-8
}

/** Parse the first payment (index 0) of a ZIP-321 URI. Supports both `zcash:ADDR?…` and `zcash:?address=…` forms. */
export function parseZip321Primary(uri: string): Zip321Primary | null {
  if (!uri.toLowerCase().startsWith("zcash:")) return null;
  const rest = uri.slice(6);
  const q = rest.indexOf("?");
  const path = q === -1 ? rest : rest.slice(0, q);
  const params = q === -1 ? [] : rest.slice(q + 1).split("&").filter(Boolean);
  let address = path;
  let amount: string | undefined;
  let memo: string | undefined;
  for (const p of params) {
    const eq = p.indexOf("=");
    const k = eq === -1 ? p : p.slice(0, eq);
    const v = eq === -1 ? "" : p.slice(eq + 1);
    if (k === "address" || k === "address.0") address = v;
    else if (k === "amount" || k === "amount.0") amount = v;
    else if (k === "memo" || k === "memo.0") {
      try {
        memo = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlDecodeBytes(v));
      } catch {
        return null;
      }
    }
  }
  if (!address) return null;
  return { address, amount, memo };
}

/**
 * Replace (or add) the memo of payment 0 in a provider-issued ZIP-321 URI, leaving every
 * other parameter — address, amount and any extra outputs (e.g. CipherPay's fee output,
 * `address.1`/`amount.1`/`memo.1`) — byte-for-byte unchanged.
 * Returns null if the URI isn't a parseable request to `expectedAddress`.
 */
export function withPrimaryMemo(uri: string, expectedAddress: string, memo: string): string | null {
  const parsed = parseZip321Primary(uri);
  if (!parsed || parsed.address !== expectedAddress) return null;
  if (utf8ByteLength(memo) > MAX_MEMO_BYTES) return null;
  const enc = base64UrlEncodeBytes(new TextEncoder().encode(memo));
  const q = uri.indexOf("?");
  if (q === -1) return `${uri}?memo=${enc}`;
  const base = uri.slice(0, q);
  const params = uri.slice(q + 1).split("&").filter(Boolean);
  // In the `zcash:?address=…` form, a bare `memo` belongs to payment 0 (ZIP-321: no index = index 0).
  let replaced = false;
  const out = params.map((p) => {
    const k = p.split("=", 1)[0];
    if (k === "memo" || k === "memo.0") {
      replaced = true;
      return `${k}=${enc}`;
    }
    return p;
  });
  if (!replaced) out.push(`memo=${enc}`);
  return `${base}?${out.join("&")}`;
}

/**
 * Live-mode URI: CipherPay's URI with our memo (memo code + user text) swapped in.
 * Falls back to building a single-output URI to the same unique address if the provider URI
 * can't be parsed (detection keys on the address, so it still works).
 */
export function liveUri(opts: { providerUri?: string; address: string; amountZec: string; memoCode?: string; text?: string }): { uri: string; memo?: string; amount?: string } | null {
  const memo = composeMemo(opts.memoCode, opts.text);
  if (memo === null) return null;
  if (opts.providerUri) {
    const parsedAmount = parseZip321Primary(opts.providerUri)?.amount;
    if (!memo) return { uri: opts.providerUri, amount: parsedAmount };
    const u = withPrimaryMemo(opts.providerUri, opts.address, memo);
    if (u) return { uri: u, memo, amount: parsedAmount };
  }
  const amt = Number(opts.amountZec);
  const amount = Number.isFinite(amt) && amt > 0 ? amt.toFixed(8) : undefined;
  return { uri: buildZip321({ address: opts.address, amount, memo }), memo, amount };
}

/** Plain words for an address made for the other Zcash network than this site runs on. */
export function networkMismatchText(addrNet: Network): string {
  return addrNet === "testnet"
    ? "That's a testnet address (test coins only). This site runs on real Zcash, so use your normal u1… or zs1… address."
    : "That's a real Zcash (mainnet) address, but this site runs on testnet. Use a testnet address (utest1…).";
}
