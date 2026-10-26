import type { InvoicePayload } from "./payload";
import { buildZip321, liveUri } from "./zcash";

// Past this length the label (a nice-to-have) is left out of the card QR so the code stays easy to scan.
const LONG_URI = 360;

/**
 * The ZIP-321 zcash: URI a wallet scans to pay this link: the same one the payment page shows in its QR.
 * Open-amount links leave the amount out, so the payer types it in their wallet.
 */
export function walletUri(p: InvoicePayload, opts: { compact?: boolean } = {}): string | null {
  if (p.p === "cipherpay") {
    if (!p.pa || !p.z) return null;
    return liveUri({ providerUri: p.u, address: p.pa, amountZec: p.z, memoCode: p.mc, text: p.m })?.uri ?? null;
  }
  if (!p.a) return null;
  const full = buildZip321({ address: p.a, amount: p.z, memo: p.m, label: p.l || p.n });
  if (opts.compact && full.length > LONG_URI) return buildZip321({ address: p.a, amount: p.z, memo: p.m });
  return full;
}
