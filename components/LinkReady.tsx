"use client";
import { useEffect, useRef, useState } from "react";
import { renderCard } from "@/lib/card";

interface Props {
  link: string;
  title?: string;
  zec?: string | null;
  usd?: string | null;
  note?: string;
  onAnother: () => void;
}

function isAbort(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}

function fileName(title?: string) {
  const slug = (title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `zeclink-${slug || "payment"}.png`;
}

/** After "Create": a preview of the payment card and two ways to share. Nothing else. */
export default function LinkReady({ link, title, zec, usd, note, onAnother }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Draw the card on this device. Redrawn when the USD price arrives.
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    renderCard({ link, title, zec, usd, note })
      .then((b) => {
        if (!alive) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
        setFailed(false);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [link, title, zec, usd, note]);

  function say(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const shareText = zec ? `Pay ${zec} ZEC${title ? ` for ${title}` : ""} privately with ZecLink` : `Pay me privately in ZEC${title ? ` for ${title}` : ""} with ZecLink`;

  async function shareLink() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: title || "Payment request", text: shareText, url: link });
        return;
      } catch (e) {
        if (isAbort(e)) return;
      }
    }
    await copyText(link);
    say("Link copied");
  }

  async function shareCard() {
    if (!blob) return;
    const name = fileName(title);
    const file = new File([blob], name, { type: "image/png" });
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: title || "Payment request", text: shareText });
        return;
      } catch (e) {
        if (isAbort(e)) return;
      }
    }
    const a = document.createElement("a");
    a.href = url ?? URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    say("Card saved");
  }

  return (
    <div className="mx-auto max-w-sm space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Your link is ready</h1>
        <p className="mt-1 text-sm text-zinc-400">Send it to whoever is paying you.</p>
      </div>

      <div
        className="mx-auto w-full overflow-hidden rounded-[20px] border border-white/10 bg-[#0b0b0f] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
        style={{ aspectRatio: "1080 / 1350" }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`Payment card${title ? ` for ${title}` : ""} with a QR code that opens the payment page`} className="block h-full w-full" data-testid="card-preview" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-500">{failed ? "Couldn't draw the card on this device." : "Making your card…"}</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-primary" onClick={shareLink}>
          Share link
        </button>
        <button type="button" className="btn-ghost !py-3 font-semibold" onClick={shareCard} disabled={!blob}>
          Share card
        </button>
      </div>

      <p className="text-center text-xs text-zinc-500">
        We don&apos;t keep a copy, so save your link.{" "}
        <button type="button" className="underline hover:text-zinc-300" onClick={onAnother}>
          Make another link
        </button>
      </p>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-4">
        {toast && (
          <div role="status" className="rounded-full border border-white/10 bg-[#0b0b0f]/95 px-4 py-2 text-sm font-medium text-zinc-100 shadow-lg">
            <span className="text-zec">✓</span> {toast}
          </div>
        )}
      </div>
    </div>
  );
}
