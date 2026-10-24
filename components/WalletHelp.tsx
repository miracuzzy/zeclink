/** Small "no wallet yet?" helper. ZecLink never creates or holds wallets. */
export default function WalletHelp() {
  return (
    <details className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-400">
      <summary className="cursor-pointer select-none text-zinc-300">No wallet yet?</summary>
      <p className="mt-2">
        Grab a free shielded Zcash wallet on your phone or computer. Open it, go to receive, and copy your address. It starts with{" "}
        <span className="font-mono">u1</span> (or <span className="font-mono">utest1</span> on testnet).
      </p>
      <p className="mt-2">
        Good picks:{" "}
        <a className="underline" href="https://zingolabs.org" target="_blank" rel="noopener noreferrer">
          Zingo
        </a>{" "}
        or{" "}
        <a className="underline" href="https://zodl.com/download/" target="_blank" rel="noopener noreferrer">
          Zodl (used to be Zashi)
        </a>
        . We never make or hold a wallet for you, and you keep your own keys.
      </p>
    </details>
  );
}
