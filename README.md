# ZecLink: private payment links for anyone who gets paid in ZEC

**Payment links for shielded Zcash, with a fixed or open amount.** Paste your own shielded address, share a link, get paid in private. Nobody
gets a map of your money. Not the person paying, not a block explorer, not ZecLink.

Made for anyone who gets paid, for example:

- **Invoice a client**: a fixed amount with a due date and a memo.
- **Pay what you want**: an open-amount link for supporters, fans or donations, with private messages.
- **Shop checkout**: one link per order, or one open-amount QR on the counter.
- **Communities and organizers**: dues, tickets or donations, without a public list of who paid.

ZecLink never creates or holds wallets, accounts or funds. You bring your own wallet (for example [Zingo](https://zingolabs.org)
or [Zodl, formerly Zashi](https://zodl.com/download/)).

**Links:** live app [zeclink.vercel.app](https://zeclink.vercel.app) · X [@zeclinkapp](https://x.com/zeclinkapp)

## What it does

- **Payment links** (`/new` → `/i/<id>#…`): your shielded address, what it's for, memo, and an **optional** amount in ZEC.
  - With an amount, it works like an invoice (USD estimate, optional due date).
  - Without one, the payer picks the amount (in ZEC or USD) and can add a private message that goes in the encrypted memo.
  The payer gets a big QR code (ZIP-321), a "Simple QR (address only)" switch for wallets that can't read the full code,
  an "Open in wallet" button, copy buttons and the raw URI as backup.
- Old tip jar links (`/t/<handle>#…`) still work and open as open-amount links. `/tip` redirects to `/new`.
- **Direct payments (default)**: money goes straight to the address in the link. There's no viewing key, so the page can't
  see the chain. It honestly says "waiting for payment, check your wallet", and the payer can tap "I've sent it", which is only a
  local note, never a confirmation.
- **Optional live tracking**: if you have your own [CipherPay](https://www.cipherpay.app) account, paste its API key on `/new`.
  The page then shows awaiting → detected (mempool, about 5 to 10 s) → confirmed (1 block, about 75 s) and gives a receipt.
- **Shielded only**: Unified (`u1…`, bech32m) and Sapling (`zs1…`, bech32) with full checksum checks.
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
| What CipherPay sees (only if you use your key) | The amount, the generic name "ZecLink payment", and (via your viewing key) the payment that comes in. Never the label, memo, name or due date via its API. A fresh one-time address per invoice, so payments can't be linked on-chain. |
| Memos & payer messages | Built **in the browser** into the ZIP-321 URI, base64url, max 512 bytes. In live mode the memo is `CP-XXXXXXXX` (CipherPay's reference code) + newline + your text, and only CipherPay's `memo` for payment 0 is replaced; address, amount and any extra outputs stay byte-for-byte. CipherPay matches payments by the unique per-invoice address, and the memo code is only a legacy fallback (see `src/invoices/matching.rs` in [cipherpay-api](https://github.com/atmospherelabs-dev/cipherpay-api)). **Caveat:** CipherPay holds the viewing key, so it could technically decrypt memos while scanning. Self-host CipherPay to remove that trust. |
| Browser → third parties | **Nothing.** A strict CSP (`connect-src 'self'`) enforces it. Status and price lookups go through ZecLink's own `/api/*`. QR codes are drawn locally. |

Other hardening: `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, `noindex`, no `X-Powered-By`.

Honest limits: anyone holding the link can read the payment details (like an invoice PDF); the host sees page paths and IPs (paths only hold a random id or the CipherPay invoice id); the payer trusts the link sender to give the right address; direct payments can't be tracked by the page.

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
lib/payload.ts             fragment encode/decode
```

## License

MIT

## Brand

Logo, favicons and the social card come from the ZecLink brand kit (Interlock mark). They live in `public/` and are
wired up in `app/layout.tsx` metadata. Fonts (Space Grotesk, Inter, JetBrains Mono) are self-hosted by `next/font`, so the
strict same-origin CSP still holds.
