# ZecLink: private payment links for anyone who gets paid in ZEC

**Invoice and tip links for shielded Zcash.** Paste your own shielded address, share a link, get paid in private. Nobody
gets a map of your money. Not the person paying, not a block explorer, not ZecLink.

Made for anyone who gets paid, for example:

- **Creators**: a tip jar for your bio or stream, with private messages from fans.
- **Sellers and small shops**: an invoice per order, or one QR on the counter.
- **Freelancers**: an invoice with a due date and a memo for each client.
- **Communities and organizers**: dues, tickets or donations, without a public list of who paid.

ZecLink never creates or holds wallets, accounts or funds. You bring your own wallet (for example [Zingo](https://zingolabs.org)
or [Zodl, formerly Zashi](https://zodl.com/download/)).

## What it does

- **Invoices** (`/new` → `/i/<id>#…`): your shielded address, amount in ZEC (with a USD estimate), what it's for, memo, due date.
  The payer gets a big QR code (ZIP-321), an "Open in wallet" button, copy buttons and the raw URI as backup.
- **Tip jars** (`/tip` → `/t/<handle>#…`): profile, suggested amounts, custom amount and a private message that goes in the encrypted memo.
- **Direct payments (default)**: money goes straight to the address in the link. There's no viewing key, so the page can't
  see the chain. It honestly says "waiting for payment, check your wallet", and the payer can tap "I've sent it", which is only a
  local note, never a confirmation.
- **Optional live tracking**: if you have your own [CipherPay](https://www.cipherpay.app) account, paste its API key on `/new`.
  The page then shows awaiting → detected (mempool, about 5 to 10 s) → confirmed (1 block, about 75 s) and gives a receipt.
- **Shielded only**: Unified (`u1…`/`utest1…`, bech32m) and Sapling (`zs1…`/`ztestsapling1…`, bech32) with full checksum checks.
  Transparent `t1/t3/tm`, TEX and Sprout addresses are rejected, and so are addresses from the wrong network.
- **Remember my address** (optional): saved in your browser's localStorage only, with a "forget it" button. Keys are never saved.
- **`/privacy`** says exactly what is and isn't stored or seen, and by whom.

## Why it doesn't leak

| Data | Where it lives |
| --- | --- |
| Address, amount, label, memo, due date, payee name | Only in the URL **fragment** (`#…`). Browsers never send fragments to servers, so the server, CDN and logs never see them. |
| Database | **None.** ZecLink is stateless. |
| Payer data | Not collected. No accounts, cookies, analytics, trackers or third-party fonts/scripts. |
| Keys | ZecLink never handles spending keys or seeds. |
| Your CipherPay API key (optional) | Sent once from your browser to `POST /api/invoices`, used for that single request to CipherPay, then dropped. Never stored, logged, returned, put in the link or kept in localStorage. |
| What CipherPay sees (only if you use your key) | The invoice amount, the generic name "ZecLink invoice", and (via your viewing key) the payment that comes in. Never the label, memo, name or due date via its API. A fresh one-time address per invoice, so payments can't be linked on-chain. |
| Memos & tip messages | Built **in the browser** into the ZIP-321 URI, base64url, max 512 bytes. In live mode the memo is `CP-XXXXXXXX` (CipherPay's reference code) + newline + your text, and only CipherPay's `memo` for payment 0 is replaced; address, amount and any extra outputs stay byte-for-byte. CipherPay matches payments by the unique per-invoice address, and the memo code is only a legacy fallback (see `src/invoices/matching.rs` in [cipherpay-api](https://github.com/atmospherelabs-dev/cipherpay-api)). **Caveat:** CipherPay holds the viewing key, so it could technically decrypt memos while scanning. Self-host CipherPay to remove that trust. |
| Browser → third parties | **Nothing.** A strict CSP (`connect-src 'self'`) enforces it. Status and price lookups go through ZecLink's own `/api/*`. QR codes are drawn locally. |

Other hardening: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, `noindex`, no `X-Powered-By`.

Honest limits: anyone holding the link can read the invoice (like an invoice PDF); the host sees page paths and IPs (paths only hold a random id or the CipherPay invoice id); the payer trusts the link sender to give the right address; direct payments can't be tracked by the page.

## Real vs mocked

| Part | Status |
| --- | --- |
| Address validation, ZIP-321 URI + QR, memo encoding, tip jar | **Real** |
| Direct payment to your address | **Real** payment request. No tracking: the page never claims a payment arrived. |
| Live tracking with your own CipherPay key | **Real**. CipherPay scans mempool + blocks with your viewing key. ZecLink polls CipherPay's public, key-free `GET /api/invoices/{id}/status` through its own server. |
| USD estimate | **Real**, CipherPay public `/api/rates`, fetched server-side |

### CipherPay limits we found (checked with real testnet calls)

- Invoice status by id is public (`GET /api/invoices/{id}/status` needs no key), so a live invoice link only needs the invoice id, never the key.
- Tip jars can't use the owner's own key: every tip needs a fresh invoice, and CipherPay's key-free donation checkout
  (`POST /api/payment-links/{slug}/checkout`) answers `403 Invalid or missing checkout key` for third parties. Keeping
  people's keys would fix it, and we won't. So tip jars are direct payments.
- The one exception is the site owner's own tip jar: if `ZECLINK_OWNER_HANDLE` and `CIPHERPAY_API_KEY` are set, `/t/<that handle>`
  gets live tracking into the owner's own CipherPay wallet. The server key is never used for anyone else.

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
| `CIPHERPAY_API_URL` | `https://api.testnet.cipherpay.app` (testnet) / `https://api.cipherpay.app` (mainnet) | Override, e.g. for a self-hosted CipherPay |
| `CIPHERPAY_API_KEY` | none | Optional. The site owner's own key, used **only** for the owner's tip jar. Server-only. |
| `ZECLINK_OWNER_HANDLE` | none | Optional. Tip jar handle that gets live tracking with `CIPHERPAY_API_KEY`. |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · [`qrcode`](https://www.npmjs.com/package/qrcode). No database, no analytics.

## Architecture

```
app/new, app/tip           create links (client-side; payload → URL fragment)
app/i/[id], app/t/[handle] payment pages (decode fragment, QR, status, receipt)
app/api/invoices           POST → CipherPay create invoice (the user's own key, or the owner tip jar)
app/api/status/[id]        GET  → CipherPay public status (proxied, no key)
app/api/rates              GET  → CipherPay public rates (proxied, cached)
lib/zcash.ts               bech32/bech32m validation, ZIP-321 builder, memo helpers
lib/payload.ts             fragment encode/decode
```

## License

MIT

## Brand

Logo, favicons and the social card come from the ZecLink brand kit (Interlock mark). They live in `public/` and are
wired up in `app/layout.tsx` metadata. Fonts (Space Grotesk, Inter, JetBrains Mono) are self-hosted by `next/font`, so the
strict same-origin CSP still holds.
