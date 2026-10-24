import "server-only";

export type Provider = "demo" | "cipherpay";

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

/** CipherPay is active only when an API key is configured. Otherwise the app runs in clearly-labelled demo mode. */
export function activeProvider(): Provider {
  return process.env.CIPHERPAY_API_KEY?.trim() ? "cipherpay" : "demo";
}

export function publicConfig() {
  return {
    provider: activeProvider(),
    network: zecNetwork(),
    payeeName: process.env.ZECLINK_PAYEE_NAME?.trim() || null,
  };
}
