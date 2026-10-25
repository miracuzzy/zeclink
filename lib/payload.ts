// Payment link data lives in the URL *fragment* (#…). Browsers never send the
// fragment to the server, so the server (and its logs / CDN) never sees the address,
// amount, memo or label. Nothing is stored in a database.
import { base64UrlDecodeBytes, base64UrlEncodeBytes } from "./zcash";

// "direct": pay straight to the creator's own address, no tracking (default).
// "cipherpay": creator's own CipherPay account made this invoice, status is tracked live.
// "owner": this deployment owner's own open-amount link, tracked with the server's own CipherPay key.
// "demo": links made by older versions; treated as "direct".
export type ProviderId = "direct" | "cipherpay" | "owner" | "demo";

export interface InvoicePayload {
  v: 1;
  k: "inv";
  p: ProviderId;
  id: string;
  a?: string; // receiving address (direct mode)
  z?: string; // amount in ZEC (string, ≤ 8 dp). Missing = open amount, the payer chooses.
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
  h?: string; // owner handle (p "owner", open amount only)
  s?: string[]; // suggested amounts in ZEC (open amount)
}

/** Old tip jar links (/t/<handle>#…). Still opened, as an open-amount payment link. */
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

// ---------------------------------------------------------------------------
// Link format v2: a compact binary payload, base64url, prefixed with "2".
// Same data, same place (the #fragment), just much shorter so the share QR stays easy
// to scan. Old v1 links (base64 JSON, they always start with "eyJ") still open.
//
// Layout: a list of [tag][value] fields. The link id is the /i/<id> path, so it isn't repeated.
//   1 address, bech32 packed: [hrp index u8][char count varint][5-bit chars packed]
//   2 address, raw utf8 string (anything that isn't plain lowercase bech32)
//   3 amount in zatoshis (varint)       4 label     5 memo     6 name
//   7 due date (days since 1970, varint) 8 created (unix seconds, varint)
//   9 provider (u8: 1 cipherpay, 2 owner; missing = direct)
//  10 extra fields as JSON (live invoice data: u, pa, e, mc, f, h, s)

const B32 = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const HRPS = ["u", "zs", "utest", "ztestsapling"];
const PROVIDERS: ProviderId[] = ["direct", "cipherpay", "owner"];

class Writer {
  b: number[] = [];
  u8(x: number) {
    this.b.push(x & 255);
  }
  varint(n: number) {
    if (!Number.isSafeInteger(n) || n < 0) throw new Error("bad int");
    while (n >= 128) {
      this.b.push((n % 128) | 128);
      n = Math.floor(n / 128);
    }
    this.b.push(n);
  }
  str(s: string) {
    const e = new TextEncoder().encode(s);
    this.varint(e.length);
    for (const x of e) this.b.push(x);
  }
}

class Reader {
  i = 0;
  constructor(private b: Uint8Array) {}
  get done() {
    return this.i >= this.b.length;
  }
  u8() {
    if (this.i >= this.b.length) throw new Error("short");
    return this.b[this.i++];
  }
  varint() {
    let n = 0;
    let m = 1;
    for (;;) {
      const x = this.u8();
      n += (x & 127) * m;
      if (!(x & 128)) break;
      m *= 128;
      if (m > 2 ** 49) throw new Error("bad int");
    }
    return n;
  }
  raw(len: number) {
    if (this.i + len > this.b.length) throw new Error("short");
    const o = this.b.slice(this.i, this.i + len);
    this.i += len;
    return o;
  }
  str() {
    return new TextDecoder("utf-8", { fatal: true }).decode(this.raw(this.varint()));
  }
}

function packAddress(w: Writer, a: string) {
  const sep = a.lastIndexOf("1");
  const hrp = HRPS.indexOf(a.slice(0, sep));
  const data = a.slice(sep + 1);
  if (sep < 1 || hrp < 0 || !data || [...data].some((c) => B32.indexOf(c) < 0)) {
    w.u8(2);
    w.str(a);
    return;
  }
  w.u8(1);
  w.u8(hrp);
  w.varint(data.length);
  let acc = 0;
  let bits = 0;
  for (const c of data) {
    acc = (acc << 5) | B32.indexOf(c);
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      w.u8((acc >> bits) & 255);
    }
    acc &= (1 << bits) - 1;
  }
  if (bits) w.u8((acc << (8 - bits)) & 255);
}

function unpackAddress(r: Reader): string {
  const hrp = HRPS[r.u8()];
  if (!hrp) throw new Error("bad hrp");
  const n = r.varint();
  if (n > 2000) throw new Error("too long");
  const bytes = r.raw(Math.ceil((n * 5) / 8));
  let out = "";
  let acc = 0;
  let bits = 0;
  for (const x of bytes) {
    acc = (acc << 8) | x;
    bits += 8;
    while (bits >= 5 && out.length < n) {
      bits -= 5;
      out += B32[(acc >> bits) & 31];
    }
    acc &= (1 << bits) - 1;
  }
  if (out.length !== n) throw new Error("short addr");
  return `${hrp}1${out}`;
}

const ZAT = 100_000_000;
function zecToZat(z: string): number | null {
  if (!/^\d{1,8}(\.\d{1,8})?$/.test(z)) return null;
  const [i, f = ""] = z.split(".");
  return Number(i) * ZAT + Number(f.padEnd(8, "0"));
}
function zatToZec(n: number): string {
  const i = Math.floor(n / ZAT);
  const f = String(n % ZAT).padStart(8, "0").replace(/0+$/, "");
  return f ? `${i}.${f}` : String(i);
}

const DAY = 86_400_000;

/** Encode an invoice link fragment in the short v2 format (without the "#"). */
export function encodeInvoiceV2(p: InvoicePayload): string {
  const w = new Writer();
  const prov = PROVIDERS.indexOf(p.p === "demo" ? "direct" : p.p);
  if (prov > 0) {
    w.u8(9);
    w.u8(prov);
  }
  if (p.a) packAddress(w, p.a);
  if (p.z) {
    const zat = zecToZat(p.z);
    if (zat === null) throw new Error("bad amount");
    w.u8(3);
    w.varint(zat);
  }
  if (p.l) {
    w.u8(4);
    w.str(p.l);
  }
  if (p.m) {
    w.u8(5);
    w.str(p.m);
  }
  if (p.n) {
    w.u8(6);
    w.str(p.n);
  }
  if (p.d && /^\d{4}-\d{2}-\d{2}$/.test(p.d)) {
    w.u8(7);
    w.varint(Math.round(Date.parse(p.d + "T00:00:00Z") / DAY));
  }
  w.u8(8);
  w.varint(Math.floor(p.c / 1000));
  const extra: Record<string, unknown> = {};
  for (const k of ["u", "pa", "e", "mc", "f", "h", "s"] as const) if (p[k] !== undefined) extra[k] = p[k];
  if (Object.keys(extra).length) {
    w.u8(10);
    w.str(JSON.stringify(extra));
  }
  return "2" + base64UrlEncodeBytes(Uint8Array.from(w.b));
}

function decodeInvoiceV2(raw: string, id: string): InvoicePayload | null {
  const r = new Reader(base64UrlDecodeBytes(raw));
  const p: InvoicePayload = { v: 1, k: "inv", p: "direct", id, c: 0 };
  while (!r.done) {
    const tag = r.u8();
    switch (tag) {
      case 1: p.a = unpackAddress(r); break;
      case 2: p.a = r.str(); break;
      case 3: p.z = zatToZec(r.varint()); break;
      case 4: p.l = r.str(); break;
      case 5: p.m = r.str(); break;
      case 6: p.n = r.str(); break;
      case 7: p.d = new Date(r.varint() * DAY).toISOString().slice(0, 10); break;
      case 8: p.c = r.varint() * 1000; break;
      case 9: {
        const v = PROVIDERS[r.u8()];
        if (!v) return null;
        p.p = v;
        break;
      }
      case 10: {
        const x = JSON.parse(r.str());
        if (!x || typeof x !== "object") return null;
        for (const k of ["u", "pa", "e", "mc", "h"] as const) if (typeof x[k] === "string") p[k] = x[k];
        if (x.f && typeof x.f === "object") p.f = x.f;
        if (Array.isArray(x.s)) p.s = x.s.map(String);
        break;
      }
      default:
        return null; // unknown field: made by a newer version, don't guess
    }
  }
  if (p.z === "0") delete p.z;
  return p;
}

/** Read an invoice link fragment, short v2 or old v1 JSON. `id` is the /i/<id> path part. */
export function decodeInvoice(frag: string, id: string): InvoicePayload | null {
  const raw = frag.startsWith("#") ? frag.slice(1) : frag;
  if (!raw) return null;
  if (raw.startsWith("2")) {
    try {
      return decodeInvoiceV2(raw.slice(1), id);
    } catch {
      return null;
    }
  }
  const v1 = decodePayload<InvoicePayload>(raw, "inv");
  return v1 && v1.id === id ? v1 : null;
}
