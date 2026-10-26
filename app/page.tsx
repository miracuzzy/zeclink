import Link from "next/link";

const who = [
  { t: "Invoice a client", d: "Set the amount and what it's for, send the link. They scan one QR and pay." },
  { t: "Pay what you want", d: "Leave the amount open for supporters, fans or donations. They can add a private message." },
  { t: "Shop checkout", d: "One link or QR per order, or an open-amount QR on the counter at your stall." },
  { t: "Communities and organizers", d: "Collect dues, ticket money or donations without a public list of who paid." },
];

const points = [
  { t: "Shielded only", d: "ZecLink refuses transparent t-addresses. Amount, sender and receiver stay encrypted on-chain." },
  { t: "No database of you", d: "Payment details ride in the link's #fragment, which browsers never send to our server." },
  { t: "Your wallet, your money", d: "Paste your own shielded address. Money goes straight to you. We never hold funds or keys." },
  { t: "One QR to pay", d: "The payer scans one code. Amount and memo fill in by themselves in their wallet." },
];

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="pt-6 text-center">
        <p className="mx-auto mb-4 inline-block rounded-full border border-zec/30 bg-zec/10 px-3 py-1 text-xs text-zec">
          Private payments on Zcash
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Private payment links for anyone who gets paid in <span className="text-zec">ZEC</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          One link for every way you get paid: a fixed amount like an invoice, or an open amount the payer picks. Nobody gets a map of your money. Not the
          person paying, not a block explorer, not us.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/new" className="btn-primary px-6">
            Make a payment link
          </Link>
          <Link href="/demo" className="btn-ghost px-6 !py-3">
            Try a demo payment
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-center text-lg font-semibold">Made for anyone who gets paid</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {who.map((w) => (
            <div key={w.t} className="card">
              <h3 className="font-semibold">{w.t}</h3>
              <p className="mt-1 text-sm text-zinc-400">{w.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Why it matters</h2>
        <p className="text-zinc-400">
          Get paid on a public chain and every payment is out in the open: who paid you, how much, and when. Anyone who
          looks gets a map of your income, your customers and your supporters. With shielded Zcash, the payment settles in about a minute, peer to peer,
          and the only people who know the amount are the two people involved.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {points.map((p) => (
          <div key={p.t} className="card">
            <h3 className="font-semibold text-zec">{p.t}</h3>
            <p className="mt-1 text-sm text-zinc-400">{p.d}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-semibold">How it works</h2>
        <ol className="space-y-3 text-sm text-zinc-300">
          <li>
            <b className="text-zec">1.</b> Paste your shielded address, the amount and what it&apos;s for.
          </li>
          <li>
            <b className="text-zec">2.</b> Share the link. Whoever is paying sees one QR code and an &quot;open in wallet&quot; button.
          </li>
          <li>
            <b className="text-zec">3.</b> They pay from any shielded wallet, straight to you. You see it land in your wallet.
          </li>
        </ol>
      </section>
    </div>
  );
}
