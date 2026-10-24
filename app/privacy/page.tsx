export const metadata = { title: "Privacy — ZecLink" };

const rows: [string, string, string][] = [
  ["Your receiving address, amount, label, memo, due date", "Only inside the link, after the #", "Browsers never send the # fragment to a server, so ZecLink's server, CDN and logs never see it."],
  ["Invoice database", "None", "There is no database. Close the tab and the only copy is the link you shared."],
  ["Payer identity, IP, wallet", "Not collected", "No accounts, no cookies, no analytics, no fingerprinting. The payer's wallet talks to the Zcash network, not to us."],
  ["Spending keys / seed phrases", "Never", "ZecLink never asks for them. In live mode CipherPay holds only a read-only viewing key."],
  ["Third-party requests from your browser", "None", "A strict Content-Security-Policy only allows this origin. Fonts are system fonts; QR codes are drawn locally."],
];

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">What ZecLink stores and leaks</h1>
        <p className="mt-2 text-zinc-400">Short version: almost nothing, and we tell you exactly what.</p>
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
          ZecLink only accepts <b>shielded</b> addresses (Unified <span className="font-mono">u1…</span> / Sapling{" "}
          <span className="font-mono">zs1…</span>, or their testnet forms). Transparent <span className="font-mono">t…</span>{" "}
          addresses are rejected because their payments are public. A shielded payment hides the sender, receiver, amount and
          memo from everyone except the two parties.
        </p>
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">When live detection (CipherPay) is on</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            The deployment owner registers their wallet&apos;s <b>Unified Full Viewing Key</b> with CipherPay. It can see incoming
            payments; it cannot spend.
          </li>
          <li>
            For each invoice ZecLink&apos;s server sends CipherPay only an <b>amount</b> and the generic name &quot;ZecLink
            invoice&quot;/&quot;ZecLink tip&quot;. Your label, memo, name and due date are never sent.
          </li>
          <li>
            CipherPay returns a fresh one-time address per invoice, so separate payments can&apos;t be linked together on-chain.
          </li>
          <li>
            The payment page polls status through ZecLink&apos;s server (<span className="font-mono">/api/status/&lt;id&gt;</span>),
            so the payer&apos;s browser never contacts CipherPay. CipherPay does learn that an invoice of that amount was paid.
          </li>
        </ul>
      </section>

      <section className="card space-y-3 text-sm text-zinc-300">
        <h2 className="text-lg font-semibold text-zinc-100">Honest limits</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Anyone you give the link to can read the invoice. Share it like you would share an invoice PDF.</li>
          <li>
            Like any website, the host (Vercel) sees the page path and IP of visitors. In live mode the path contains the CipherPay
            invoice id, never the address or amount.
          </li>
          <li>The USD estimate comes from CipherPay&apos;s public price feed, fetched by our server, not your browser.</li>
          <li>
            <b>Demo mode</b> (no CipherPay key configured) cannot see payments. The QR is a real request to the address entered,
            but the status steps are simulated with buttons and the receipt is stamped &quot;NOT A REAL PAYMENT&quot;.
          </li>
        </ul>
      </section>
    </article>
  );
}
