import "server-only";
import { checkAddress } from "@/lib/zcash";

export const CIPHERPAY_DEFAULT_TESTNET = "https://api.testnet.cipherpay.app";
export const CIPHERPAY_DEFAULT_MAINNET = "https://api.cipherpay.app";

export function zecNetwork(): "testnet" | "mainnet" {
  return process.env.NEXT_PUBLIC_ZEC_NETWORK === "testnet" ? "testnet" : "mainnet";
}

export function cipherpayBase(): string {
  const env = process.env.CIPHERPAY_API_URL?.trim().replace(/\/+$/, "");
  if (env) return env;
  return zecNetwork() === "mainnet" ? CIPHERPAY_DEFAULT_MAINNET : CIPHERPAY_DEFAULT_TESTNET;
}

/**
 * The deployment owner's own CipherPay key. Used ONLY for the owner's tip jar (ZECLINK_OWNER_HANDLE),
 * never as the default payee for anyone else.
 *  - mainnet: only CIPHERPAY_API_KEY_MAINNET. A leftover testnet CIPHERPAY_API_KEY is never used on mainnet.
 *  - testnet: CIPHERPAY_API_KEY_TESTNET, or CIPHERPAY_API_KEY (older setups).
 */
export function ownerKey(): string | null {
  const k =
    zecNetwork() === "mainnet"
      ? process.env.CIPHERPAY_API_KEY_MAINNET
      : process.env.CIPHERPAY_API_KEY_TESTNET || process.env.CIPHERPAY_API_KEY;
  return k?.trim() || null;
}

/** The owner's own shielded address on this network, for direct tips when there's no key. Invalid or wrong-network values are ignored. */
export function ownerAddress(): string | null {
  const a = process.env.ZECLINK_OWNER_ADDRESS?.trim();
  if (!a) return null;
  const c = checkAddress(a);
  return c.ok && c.network === zecNetwork() ? a : null;
}

/** The owner's tip-jar handle, if the owner set up either live tracking (key) or a direct address. */
export function ownerHandle(): string | null {
  const h = process.env.ZECLINK_OWNER_HANDLE?.trim().toLowerCase().replace(/^@/, "");
  return h && (ownerKey() || ownerAddress()) ? h : null;
}

/** A creator-supplied CipherPay API key. Checked for shape only; used for one request, never stored or logged. */
export function isCipherpayKey(k: unknown): k is string {
  return typeof k === "string" && /^cpay_(sk|rk)_[A-Za-z0-9_-]{8,200}$/.test(k.trim());
}

export function publicConfig() {
  return {
    network: zecNetwork(),
    ownerHandle: ownerHandle(),
    ownerLive: !!ownerHandle() && !!ownerKey(),
    // Public on purpose: it's the address tippers pay, shown in the QR anyway.
    ownerAddress: ownerHandle() ? ownerAddress() : null,
    payeeName: process.env.ZECLINK_PAYEE_NAME?.trim() || null,
  };
}
