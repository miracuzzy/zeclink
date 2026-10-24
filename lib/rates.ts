import "server-only";
import { cipherpayBase } from "./server-config";

export interface Rates {
  usd: number;
  updatedAt: string | null;
}

// Public, unauthenticated price feed from CipherPay. Fetched server-side so the
// payer's browser never contacts a third party.
export async function getRates(): Promise<Rates | null> {
  try {
    const res = await fetch(`${cipherpayBase()}/api/rates`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (typeof j.zec_usd !== "number") return null;
    return { usd: j.zec_usd, updatedAt: j.updated_at ?? null };
  } catch {
    return null;
  }
}
