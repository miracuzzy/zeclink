"use client";
import { useEffect, useMemo, useState } from "react";
import ModeBanner from "@/components/ModeBanner";
import CopyButton from "@/components/CopyButton";
import Qr from "@/components/Qr";
import WalletHelp from "@/components/WalletHelp";
import { forgetAddress, loadSavedAddress, saveAddress, useConfig } from "@/lib/client";
import { checkAddress, normaliseZec } from "@/lib/zcash";
import { encodePayload, type TipPayload } from "@/lib/payload";

export default function NewTipJar() {
  const cfg = useConfig();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [amounts, setAmounts] = useState("0.01, 0.05, 0.1");
  const [link, setLink] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [saved, setSaved] = useState(false);

  // (Read after mount, so the server-rendered HTML and first client render match.)
  useEffect(() => {
    const t = setTimeout(() => {
      const a = loadSavedAddress();
      if (a) {
        setAddress((cur) => cur || a);
        setRemember(true);
        setSaved(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const addr = useMemo(() => checkAddress(address), [address]);
  const netMismatch = addr.ok && cfg && addr.network !== cfg.network;
  const cleanHandle = handle.trim().replace(/^@/, "").toLowerCase();
  const handleOk = /^[a-z0-9_-]{2,30}$/.test(cleanHandle);
  // Only the site owner's own handle gets live tracking (with the site's own CipherPay account).
  const usesProvider = !!cfg?.ownerHandle && cleanHandle === cfg.ownerHandle;
  const suggested = amounts
    .split(/[\s,]+/)
    .map((a) => normaliseZec(a))
    .filter((a): a is string => !!a)
    .slice(0, 4);
  const valid = handleOk && (usesProvider || (addr.ok && !netMismatch));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || !cfg) return;
    if (!usesProvider && remember) {
      saveAddress(address.trim());
      setSaved(true);
    }
    const p: TipPayload = {
      v: 1,
      k: "tip",
      p: usesProvider ? "owner" : "direct",
      h: cleanHandle,
      n: name.trim() || undefined,
      b: bio.trim() || undefined,
      a: usesProvider ? undefined : address.trim(),
      s: suggested.length ? suggested : undefined,
    };
    setLink(`${window.location.origin}/t/${cleanHandle}#${encodePayload(p)}`);
  }

  if (link)
    return (
      <div className="mx-auto max-w-md space-y-5">
        <h1 className="text-2xl font-bold">Your tip jar is live</h1>
        <div className="card space-y-4">
          <Qr value={link} size={220} label="QR code of the tip jar link" />
          <code className="block break-all rounded-lg bg-black/40 p-3 text-xs text-zinc-300">{link}</code>
          <div className="grid grid-cols-2 gap-2">
            <CopyButton text={link} label="Copy link" />
            <a className="btn-ghost" href={link}>
              Open tip jar
            </a>
          </div>
          <p className="text-xs text-zinc-500">Put it in your bio, on stream, or print the QR for your stall.</p>
        </div>
        <button className="btn-ghost w-full" onClick={() => setLink(null)}>
          Edit
        </button>
      </div>
    );

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Tip jar</h1>
        <p className="text-sm text-zinc-400">One link for fans to tip you in shielded ZEC.</p>
      </div>
      <div>
        <label className="label" htmlFor="h">
          Handle
        </label>
        <input id="h" className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@adaart" />
        {handle && !handleOk && <p className="hint text-red-400">2 to 30 letters, numbers, _ or -</p>}
      </div>
      <div>
        <label className="label" htmlFor="n">
          Display name
        </label>
        <input id="n" className="input" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okafor" />
      </div>
      <div>
        <label className="label" htmlFor="b">
          A line for your supporters
        </label>
        <input id="b" className="input" maxLength={140} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Illustrator and coffee addict. Thanks for the love 💛" />
      </div>
      {usesProvider ? (
        <div className="space-y-2">
          <ModeBanner live network={cfg?.network ?? "testnet"} compact />
          <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
            This is the site owner&apos;s tip jar. Tips go to the owner&apos;s own wallet, each to a fresh one-time address, with live
            tracking.
          </p>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="a">
            Shielded receiving address
          </label>
          <textarea
            id="a"
            className="input min-h-[84px] font-mono text-xs"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            spellCheck={false}
            placeholder={cfg?.network === "mainnet" ? "u1… or zs1…" : "utest1… or ztestsapling1…"}
          />
          {address && !addr.ok && <p className="hint text-red-400">{addr.error}</p>}
          {addr.ok && netMismatch && <p className="hint text-red-400">This address is for {addr.network}, deployment runs {cfg?.network}.</p>}
          {addr.ok && !netMismatch && <p className="hint text-emerald-400">✓ Valid shielded address</p>}
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-zinc-400">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember my address on this device
            </label>
            {saved && (
              <button
                type="button"
                className="underline"
                onClick={() => {
                  forgetAddress();
                  setSaved(false);
                  setRemember(false);
                }}
              >
                Forget it
              </button>
            )}
          </div>
          <p className="hint">Tips go straight to this address. The tip page can&apos;t see the chain, so check your wallet for tips.</p>
          <div className="mt-3">
            <WalletHelp />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="s">
          Suggested amounts (ZEC)
        </label>
        <input id="s" className="input font-mono" value={amounts} onChange={(e) => setAmounts(e.target.value)} />
        <p className="hint">Up to 4, comma separated. Supporters can also type their own.</p>
      </div>
      <button className="btn-primary w-full" disabled={!valid}>
        Create tip jar link
      </button>
    </form>
  );
}
