import Link from "next/link";

const points = [
  { t: "Shielded only", d: "ZecLink refuses transparent t-addresses. Amount, sender and receiver stay encrypted on-chain." },
  { t: "No database of you", d: "Invoice details ride in the link's #fragment, which browsers never send to our server." },
  { t: "Live status", d: "With CipherPay, the page flips from awaiting → detected → confirmed in about a minute." },
  { t: "Receipts", d: "Download or print a receipt the moment the payment confirms — generated in the browser." },
];

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="pt-6 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Payment links for <span className="text-zec">shielded ZEC</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          Send an invoice or a tip jar link. Get paid in private. Nobody — not your client, not a block explorer, not us — gets
          a map of your income.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/new" className="btn-primary px-6">
            Create an invoice
          </Link>
          <Link href="/tip" className="btn-ghost px-6 py-3">
            Make a tip jar
          </Link>
        </div>
      </section>

      <section className="card">
        <h2 className="mb-2 text-lg font-semibold">Why it matters</h2>
        <p className="text-zinc-400">
          A freelancer getting paid by clients abroad on a public chain broadcasts every invoice: who pays them, how much,
          and when. That&apos;s a target on their back. With shielded Zcash, the payment settles in about a minute, peer to peer,
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
            <b className="text-zec">1.</b> Enter your shielded address, the amount and what it&apos;s for.
          </li>
          <li>
            <b className="text-zec">2.</b> Share the link. Your client sees a big QR code and a one-tap &quot;open in wallet&quot; button
            (standard ZIP-321).
          </li>
          <li>
            <b className="text-zec">3.</b> They pay from any shielded wallet. The page shows it arrive and issues a receipt.
          </li>
        </ol>
      </section>
    </div>
  );
}
