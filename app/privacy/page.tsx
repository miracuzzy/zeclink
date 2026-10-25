export const metadata = { title: "Privacy | ZecLink" };

const rows: [string, string, string][] = [
  ["Your address, amount, what it's for, note", "Only inside the link, after the #", "Browsers never send the # part to a server, so ZecLink's server, CDN and logs never see it."],
  ["Payment link database", "None", "There's no database. Close the tab and the only copy is the link you shared."],
  ["Wallets and accounts", "We don't make any", "ZecLink never creates, holds or touches a wallet. You use your own and keep your own keys."],
  ["Payer identity, IP, wallet", "Not collected", "No accounts, no cookies, no analytics, no fingerprinting. The payer's wallet talks to the Zcash network, not to us."],
  ["Spending keys and seed phrases", "Never", "ZecLink never asks for them."],
  ["Remembered address", "Your browser only", "If you tick \"remember on this device\", your address is saved in this browser's local storage so it's filled in next time. It's never sent to us. \"Forget it\" deletes it. API keys are never remembered."],
  ["Third-party requests from your browser", "None", "A strict Content-Security-Policy only allows this site. Fonts and icons are served from this site and QR codes are drawn on your device."],
];

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">What ZecLink stores and leaks</h1>
        <p className="mt-2 text-zinc-400">Short version: almost nothing, and here&apos;s exactly what. Same for everyone, whether you sell, stream, freelance or run a group.</p>
      </header>

      <section className="space-y-3">
        {rows.map(([what, where, why]) => (
          <div key={what} className="card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{what}</h2>
              <span className="pill border-zec/40 text-zec">{where}</span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">{why}</p>
          </div>
        ))}
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">On-chain</h2>
        <p>
          ZecLink only accepts <b>shielded</b> addresses (Unified <span className="font-mono">u1…</span> or Sapling{" "}
          <span className="font-mono">zs1…</span>{process.env.NEXT_PUBLIC_ZEC_NETWORK !== "testnet" ? "" : ", or their testnet forms"}). Transparent <span className="font-mono">t…</span>, TEX
          and old Sprout addresses are rejected because they leak. A shielded payment hides the sender, receiver, amount and memo
          from everyone except the people involved.
        </p>
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">What the payer sees</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>The amount, what it&apos;s for and your note.</li>
          <li>
            Your receiving address is <b>not</b> printed on the page, but it is inside the link and the QR code, because their wallet
            needs it to pay you. Anyone with the link could dig it out, so treat the link like an invoice.
          </li>
          <li>
            With a shielded address that&apos;s ok: knowing it doesn&apos;t show your balance, your other payments or who else pays you.
          </li>
          <li>
            Want more? Use a fresh address from your wallet for each link (most shielded wallets can make new ones, and they all land in
            the same wallet). Then two payers can&apos;t tell their links go to the same person.
          </li>
        </ul>
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">Default: direct payments</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>You paste your own address. The payer&apos;s wallet pays it straight from the QR code or link.</li>
          <li>Nobody but you and the payer is involved. No third party sees anything.</li>
          <li>
            Because nothing holds a viewing key, the page can&apos;t see the payment and never says it&apos;s paid. Check your
            wallet.
          </li>
        </ul>
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">Optional: live tracking with your own CipherPay account</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Hidden from the simple form (open <span className="font-mono">/new?live</span> to show it). If you have a CipherPay
            account (it holds a read-only viewing key for <b>your</b> wallet), you can paste its API key when making a fixed-amount
            payment link. Your browser sends it to ZecLink&apos;s server once, the server uses it for that single request to
            CipherPay and drops it. It&apos;s never saved, logged, put in the link or kept in your browser.
          </li>
          <li>
            CipherPay gets only an <b>amount</b> and the generic name &quot;ZecLink payment&quot;. What it&apos;s for and your note
            never go to its API. It returns a fresh one-time address in your wallet, so your usual address is never in the link
            and separate payments can&apos;t be linked.
          </li>
          <li>
            Your memo is added to the payment request in the browser, after CipherPay&apos;s short reference code (like{" "}
            <span className="font-mono">CP-1A2B3C4D</span>), and travels only inside the encrypted memo. CipherPay spots the payment
            by its unique address, so it doesn&apos;t need the memo.
          </li>
          <li>
            <b>Who sees what:</b> CipherPay sees the amount and, using your viewing key, the payment that comes in. Since it
            holds that viewing key, it could technically read the memo too. Nobody else sees any of it. The page checks status
            through ZecLink&apos;s own server (<span className="font-mono">/api/status/&lt;id&gt;</span>), so the payer&apos;s browser
            never talks to CipherPay.
          </li>
          <li>
            Links with an open amount (the payer picks it) can&apos;t use your own CipherPay key. Each payment would need a fresh
            CipherPay invoice made later, which would mean keeping your key, and we won&apos;t do that. So open-amount links are
            direct payments (this site owner&apos;s own link is the only exception).
          </li>
        </ul>
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">Honest limits</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Anyone you give the link to can read the payment details. Share it like you&apos;d share an invoice PDF.</li>
          <li>
            Like any website, the host (Vercel) sees page paths and visitor IPs. Paths only hold a random id or the CipherPay payment
            id, never the address or amount.
          </li>
          <li>The USD estimate comes from CipherPay&apos;s public price feed, fetched by our server, not your browser.</li>
          <li>The payer trusts the link sender to give the right address, same as with any invoice or bank details.</li>
        </ul>
      </section>
    </article>
  );
}
