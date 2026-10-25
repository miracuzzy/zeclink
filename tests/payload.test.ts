// Run: npm test
import assert from "node:assert/strict";
import { decodeInvoice, encodeInvoiceV2, encodePayload, type InvoicePayload } from "../lib/payload";

const A = "u1ddnjsdcpm36r6aq79n3s68shjweksnmwtdltrh046s8m6xcws9ygyawalxx8n6hg6vegk0wh8zjnafxgh6msppjsljvyt0ynece3lvm0";
const base: InvoicePayload = { v: 1, k: "inv", p: "direct", id: "ab12cd34", a: A, z: "0.25", l: "Order #12", m: "thanks 🙏 INV-0042", n: "Ada Shop", d: "2026-11-30", c: 1792898464000 };
const cases: InvoicePayload[] = [
  base,
  { ...base, z: undefined, d: undefined },
  { ...base, a: "zs1z7rejlpsa98s2rrrfkwmaxu53e4ue0ulcrw0h4x5g8jl04tak0d3mm47vdtahatqrlkngh9sly" },
  { ...base, a: "utest1abc" },
  { ...base, z: "21000000" },
  { ...base, z: "0.00000001" },
  { v: 1, k: "inv", p: "cipherpay", id: "6f1c2a8e-1111-2222-3333-444455556666", z: "0.0123", u: `zcash:${A}?amount=0.0123&memo=Q1AtMUEyQg`, pa: A, e: "2026-10-25T05:00:00Z", mc: "CP-1A2B", f: { cur: "USD", amt: 15 }, c: 1792898464000 },
];
for (const c of cases) {
  const frag = encodeInvoiceV2(c);
  assert.ok(frag.startsWith("2"));
  const back = decodeInvoice("#" + frag, c.id);
  const want = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined));
  assert.deepEqual(back, want, JSON.stringify(c));
}
// old v1 links still work, and must match the path id
const old = encodePayload(base);
assert.deepEqual(decodeInvoice("#" + old, base.id), base);
assert.equal(decodeInvoice("#" + old, "other"), null);
// junk
assert.equal(decodeInvoice("#2!!!", "x"), null);
assert.equal(decodeInvoice("#2" + "AAAA", "x"), null);
assert.equal(decodeInvoice("", "x"), null);
const v1len = old.length, v2len = encodeInvoiceV2(base).length;
console.log(`ok: v1 fragment ${v1len} chars, v2 fragment ${v2len} chars`);
