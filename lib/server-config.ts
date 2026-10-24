import "server-only";

export const CIPHERPAY_DEFAULT_TESTNET = "https://api.testnet.cipherpay.app";
export const CIPHERPAY_DEFAULT_MAINNET = "https://api.cipherpay.app";

export function zecNetwork(): "testnet" | "mainnet" {
  return process.env.NEXT_PUBLIC_ZEC_NETWORK === "mainnet" ? "mainnet" : "testnet";
}

export function cipherpayBase(): string {
  const env = process.env.CIPHERPAY_API_URL?.trim().replace(/\/+$/, "");
  if (env) return env;
  return zecNetwork() === "mainnet" ? CIPHERPAY_DEFAULT_MAINNET : CIPHERPAY_DEFAULT_TESTNET;
}

/**
 * The server's own CipherPay key belongs to the deployment owner. It is used ONLY for the owner's
 * tip jar (handle in ZECLINK_OWNER_HANDLE), never as the default payee for anyone else.
 */
export function ownerHandle(): string | null {
  const h = process.env.ZECLINK_OWNER_HANDLE?.trim().toLowerCase();
  return h && process.env.CIPHERPAY_API_KEY?.trim() ? h : null;
}

/** A creator-supplied CipherPay API key. Checked for shape only; used for one request, never stored or logged. */
export function isCipherpayKey(k: unknown): k is string {
  return typeof k === "string" && /^cpay_(sk|rk)_[A-Za-z0-9_-]{8,200}$/.test(k.trim());
}

export function publicConfig() {
  return {
    network: zecNetwork(),
    ownerHandle: ownerHandle(),
    payeeName: process.env.ZECLINK_PAYEE_NAME?.trim() || null,
  };
}
