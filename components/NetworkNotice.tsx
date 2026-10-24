/** Shown when a link was made for the other Zcash network than this site runs on (e.g. an old testnet link). */
export default function NetworkNotice({ linkNetwork, siteNetwork }: { linkNetwork: "testnet" | "mainnet"; siteNetwork: "testnet" | "mainnet" }) {
  if (linkNetwork === siteNetwork) return null;
  return (
    <div role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
      {linkNetwork === "testnet" ? (
        <>
          <b>This link is for Zcash testnet.</b> Testnet coins are only for testing and have no value. A normal wallet can&apos;t pay it,
          and you shouldn&apos;t try. Ask for a fresh link.
        </>
      ) : (
        <>
          <b>This link is for real Zcash (mainnet)</b>, but this site runs on testnet. Paying it sends real ZEC.
        </>
      )}
    </div>
  );
}
