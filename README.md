# ZecLink: private payment links for anyone who gets paid in ZEC

**Payment links for shielded Zcash, with a fixed or open amount.** Paste your own shielded address, share a link, get paid in private. Nobody
gets a map of your money. Not the person paying, not a block explorer, not ZecLink.

Made for anyone who gets paid, for example:

- **Invoice a client**: a fixed amount with what it's for and a note.
- **Pay what you want**: an open-amount link for supporters, fans or donations, with private messages.
- **Shop checkout**: one link per order, or one open-amount QR on the counter.
- **Communities and organizers**: dues, tickets or donations, without a public list of who paid.

ZecLink never creates or holds wallets, accounts or funds. You bring your own wallet (for example [Zingo](https://zingolabs.org)
or [Zodl, formerly Zashi](https://zodl.com/download/)).

**Links:** live app [zeclink.vercel.app](https://zeclink.vercel.app) · X [@zeclinkapp](https://x.com/zeclinkapp)

## What it does

- **Payment links** (`/new` → `/i/<id>#…`): four fields. Your shielded address, the amount in ZEC, what it's for, and an
  optional note that goes in the encrypted memo. A small "let the payer choose the amount" switch makes an open-amount link instead.
- **Link ready screen**: copy the link, open it, or download the share QR as a PNG. The share QR only opens the payment page
  in a phone camera. It isn't a wallet code.
- **Payer page**: the amount (ZEC and USD), what it's for, the note, **one** wallet QR (a full ZIP-321 payment code with the
  amount and memo filled in) and an "Open in wallet" button. The receiving address isn't printed on the page.
- **Direct payments (default)**: money goes straight to the address in the link. There's no viewing key, so the page can't
  see the chain and never says a payment arrived. Check your wallet.
- **Live tracking (hidden, `/new?live`)**: if you have your own [CipherPay](https://www.cipherpay.app) account, paste its API key.
  The page then shows awaiting → detected → confirmed and gives a receipt. Each invoice uses a fresh one-time address, so your
  usual address is never in the link.
- Old links (v1 base64 JSON fragments, and old tip jar links `/t/<handle>#…`) still open. `/tip` redirects to `/new`.
- **Shielded only**: Unified (`u1…`, bech32m) and Sapling (`zs1…`, bech32) with full checksum checks.
  Transparent `t1/t3/tm`, TEX and Sprout addresses are rejected, and so are addresses from the wrong network.
- **Remember on this device** (optional): saved in your browser's localStorage only, with a "forget it" button. Keys are never saved.
- **`/privacy`** says exactly what is and isn't stored or seen, and by whom.

## Why it doesn't leak

| Data | Where it lives |
| --- | --- |
| Address, amount, what it's for, note | Only in the URL **fragment** (`#…`), in a compact binary format (see below). Browsers never send fragments to servers, so the server, CDN and logs never see them. |
| Database | **None.** ZecLink is stateless. |
| Payer data | Not collected. No accounts, cookies, analytics, trackers or third-party fonts/scripts. |
| Keys | ZecLink never handles spending keys or seeds. |
| Your CipherPay API key (optional) | Sent once from your browser to `POST /api/invoices`, used for that single request to CipherPay, then dropped. Never stored, logged, returned, put in the link or kept in localStorage. |
| What CipherPay sees (only if you use your key) | The amount, the generic name "ZecLink payment", and (via your viewing key) the payment that comes in. Never what it's for or your note via its API. A fresh one-time address per invoice, so payments can't be linked on-chain. |
| Memos & payer messages | Built **in the browser** into the ZIP-321 URI, base64url, max 512 bytes. In live mode the memo is `CP-XXXXXXXX` (CipherPay's reference code) + newline + your text, and only CipherPay's `memo` for payment 0 is replaced; address, amount and any extra outputs stay byte-for-byte. CipherPay matches payments by the unique per-invoice address, and the memo code is only a legacy fallback (see `src/invoices/matching.rs` in [cipherpay-api](https://github.com/atmospherelabs-dev/cipherpay-api)). **Caveat:** CipherPay holds the viewing key, so it could technically decrypt memos while scanning. Self-host CipherPay to remove that trust. |
| Browser → third parties | **Nothing.** A strict CSP (`connect-src 'self'`) enforces it. Status and price lookups go through ZecLink's own `/api/*`. QR codes are drawn locally. |

Other hardening: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, `noindex`, no `X-Powered-By`.

Honest limits: anyone holding the link can read the payment details, including the receiving address (the wallet needs it, the page just doesn't print it), like an invoice PDF. A shielded address doesn't reveal your balance or other payments, and using a fresh address from your wallet per link keeps links from being tied together; the host sees page paths and IPs (paths only hold a random id or the CipherPay invoice id); the payer trusts the link sender to give the right address; direct payments can't be tracked by the page.

## Real vs mocked

| Part | Status |
| --- | --- |
| Address validation, ZIP-321 URI + QR, memo encoding, fixed and open amounts | **Real** |
| Direct payment to your address | **Real** payment request. No tracking: the page never claims a payment arrived. |
| Live tracking with your own CipherPay key | **Real**. CipherPay scans mempool + blocks with your viewing key. ZecLink polls CipherPay's public, key-free `GET /api/invoices/{id}/status` through its own server. |
| USD estimate | **Real**, CipherPay public `/api/rates`, fetched server-side |

### CipherPay limits we found (checked with real API calls)

- Invoice status by id is public (`GET /api/invoices/{id}/status` needs no key), so a live invoice link only needs the invoice id, never the key.
- Open-amount links can't use the creator's own key: every payment needs a fresh invoice, and CipherPay's key-free donation checkout
  (`POST /api/payment-links/{slug}/checkout`) answers `403 Invalid or missing checkout key` for third parties. Keeping
  people's keys would fix it, and we won't. So open-amount links are direct payments, and live tracking with your
  own key needs a fixed amount.
- The one exception is the site owner's own open-amount link (old tip jar): if `ZECLINK_OWNER_HANDLE` and the owner key are set, `/t/<that handle>`
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
| `CIPHERPAY_API_KEY_MAINNET` | none | Optional. The site owner's own CipherPay key, used **only** for the owner's own link. Server-only. |
| `ZECLINK_OWNER_HANDLE` | none | Optional. Handle of the site owner's own open-amount link (`/t/<handle>`). Needs a key or an owner address. |
| `ZECLINK_OWNER_ADDRESS` | none | Optional. The owner's own shielded address. The owner's link pays it directly when there's no key, or if CipherPay is down. |
| `CIPHERPAY_API_URL` | `https://api.cipherpay.app` | Override, e.g. for a self-hosted CipherPay |

ZecLink runs on Zcash mainnet. To get a CipherPay account, sign up at https://www.cipherpay.app/dashboard/register with a
viewing key (`uview1…` or `uivk1…`) from a wallet you use only for this, and save the API key it shows once.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · [`qrcode`](https://www.npmjs.com/package/qrcode). No database, no analytics.

## Architecture

```
app/new                    create payment links (client-side; payload → URL fragment); /tip redirects here
app/i/[id], app/t/[handle] payer page, fixed or open amount (components/PayView.tsx)
app/api/invoices           POST → CipherPay create invoice (the user's own key, or the owner's own link)
app/api/status/[id]        GET  → CipherPay public status (proxied, no key)
app/api/rates              GET  → CipherPay public rates (proxied, cached)
lib/zcash.ts               bech32/bech32m validation, ZIP-321 builder, memo helpers
lib/payload.ts             fragment encode/decode (v2 compact + old v1 JSON)
tests/payload.test.ts      round-trip tests for the link format (npm test)
```

## Link format

The link is `https://<site>/i/<id>#2<base64url>`. The `2` is the format version. The bytes are a short list of tagged fields:
the address packed from its bech32 characters (5 bits each), the amount in zatoshis, what it's for, the note and when it was made.
That keeps a typical link around 200 characters, so its QR stays small enough to scan off a laptop screen. Links made before
this (base64 JSON, starting with `eyJ`) still open.

### Why not hide the address completely?

The payer's wallet needs a real address to pay, so it has to be in the link or QR. Deriving a fresh address per link in the browser
would need your viewing key and Orchard crypto in the page, and a viewing key in a link would expose your incoming payments, so
ZecLink doesn't do that. The options that work today: make a fresh address in your wallet for each link, or use live tracking,
where CipherPay hands out a one-time address per invoice.

## License

MIT

## Brand

Logo, favicons and the social card come from the ZecLink brand kit (Interlock mark). They live in `public/` and are
wired up in `app/layout.tsx` metadata. Fonts (Space Grotesk, Inter, JetBrains Mono) are self-hosted by `next/font`, so the
strict same-origin CSP still holds.
