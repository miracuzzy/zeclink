export type PublicStatus = "awaiting" | "underpaid" | "detected" | "confirmed" | "expired" | "refunded" | "cancelled" | "unknown";

export interface StatusResponse {
  status: PublicStatus;
  txid: string | null;
  receivedZat: number | null;
  priceZat: number | null;
  checkedAt: string;
}

export interface PublicConfig {
  provider: "demo" | "cipherpay";
  network: "testnet" | "mainnet";
  payeeName: string | null;
}

export interface RatesResponse {
  usd: number;
  eur: number;
  updatedAt: string | null;
}
