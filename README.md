# ZecLink — payment links for shielded ZEC

**Stripe-style invoice and tip links for shielded Zcash.** A freelancer or creator makes a link, shares it, and gets paid in
shielded ZEC. Nobody — not the client, not a block explorer, not ZecLink — gets a map of their income.

## What it does

- **Invoices** (`/new` → `/i/<id>#…`): payee name, amount in ZEC (with ≈ USD estimate), what it's for, memo, due date.
  The payer sees a big QR code (ZIP-321), an "Open in wallet" button, copy buttons for link / address / amount / memo and the raw URI as backup.
- **Live status**: awaiting → detected (mempool, ~5–10 s) → confirmed (1 block, ~75 s), then a **downloadable / printable receipt**.
- **Tip jars** (`/tip` → `/t/<handle>#…`): creator profile with suggested amounts, custom amount and an encrypted private message (memo).
- **Shielded only**: Unified (`u1…`/`utest1…`, bech32m) and Sapling (`zs1…`/`ztestsapling1…`, bech32) addresses with full checksum validation.
  Transparent `t1/t3/tm`, TEX and Sprout addresses are rejected. Network mismatch (testnet vs mainnet) is rejected too.
- **`/privacy`** explains exactly what is and isn't stored or leaked.

## Why it doesn't leak

| Data | Where it lives |
| --- | --- |
| Address, amount, label, memo, due date, payee name | Only in the URL **fragment** (`#…`). Browsers never send fragments to servers, so the server, CDN and logs never see them. |
| Database | **None.** ZecLink is stateless. |
| Payer data | Not collected. No accounts, cookies, analytics, trackers or third-party fonts/scripts. |
| Keys | ZecLink never handles spending keys or seeds. In live mode only CipherPay holds a **read-only viewing key** (UFVK). |
| What CipherPay sees (live mode) | Only an amount and a generic name ("ZecLink invoice"/"ZecLink tip"). Never the label, memo, name or due date. It issues a fresh one-time diversified address per invoice, so payments are unlinkable on-chain. |
| Browser → third parties | **Nothing.** A strict CSP (`connect-src 'self'`) enforces it; status and price lookups are proxied through ZecLink's own `/api/*`. QR codes are rendered locally. |

Other hardening: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, `noindex`, no `X-Powered-By`.

Honest limits: anyone holding the link can read the invoice (like an invoice PDF); the host sees page paths and IPs (paths contain only a random id or the CipherPay invoice id); the link sender is trusted to give the right address.

## Real vs mocked

| Part | Status |
| --- | --- |
| Address validation, ZIP-321 URI + QR generation, memo encoding, receipt, tip jar | **Real** |
| USD estimate | **Real** — CipherPay public `/api/rates`, fetched server-side |
| Payment detection with `CIPHERPAY_API_KEY` set | **Real** — CipherPay scans mempool + blocks with the merchant's viewing key; ZecLink polls `GET /api/invoices/{id}/status` |
| Payment detection without a key (**demo mode**) | **Simulated.** The QR is a real payment request to the entered address, but status changes come from "Simulate" buttons. Every demo screen is labelled DEMO MODE and demo receipts are stamped "NOT A REAL PAYMENT". |

In live mode, payments go to the wallet whose UFVK is registered with the deployment owner's CipherPay merchant account (one merchant per deployment — self-host it for yourself). Demo mode uses the address you type in.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional
npm run dev                  # http://localhost:3000
npm run build && npm start
```

## Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_ZEC_NETWORK` | `testnet` | `testnet` or `mainnet`; addresses from the other network are rejected |
| `CIPHERPAY_API_KEY` | — | CipherPay merchant API key (`cpay_sk_…`). Set → live detection; empty → demo mode. Server-only. |
| `CIPHERPAY_API_URL` | `https://api.testnet.cipherpay.app` (testnet) / `https://api.cipherpay.app` (mainnet) | Override, e.g. for a self-hosted CipherPay |

### Turning on live testnet detection

1. Install a testnet-capable wallet (e.g. Zingo) and get testnet ZEC from a faucet.
2. Copy the wallet's **Unified Full Viewing Key** (`uviewtest…`) — read-only, cannot spend.
3. Register a merchant on **https://testnet.cipherpay.app** with that UFVK and save the **API key** (shown once).
4. Set `CIPHERPAY_API_KEY` (and `NEXT_PUBLIC_ZEC_NETWORK=testnet`) and redeploy.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · [`qrcode`](https://www.npmjs.com/package/qrcode). No database, no analytics.

## Architecture

```
app/new, app/tip          create links (client-side; payload → URL fragment)
app/i/[id], app/t/[handle] payment pages (decode fragment, QR, status, receipt)
app/api/invoices          POST → CipherPay create invoice (live mode only)
app/api/status/[id]       GET  → CipherPay public status (proxied)
app/api/rates             GET  → CipherPay public rates (proxied, cached)
lib/zcash.ts              bech32/bech32m validation, ZIP-321 builder
lib/payload.ts            fragment encode/decode
```

## License

MIT
