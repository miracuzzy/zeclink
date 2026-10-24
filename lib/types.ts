export type PublicStatus = "awaiting" | "underpaid" | "detected" | "confirmed" | "expired" | "refunded" | "cancelled" | "unknown";

export interface StatusResponse {
  status: PublicStatus;
  txid: string | null;
  receivedZat: number | null;
  priceZat: number | null;
  checkedAt: string;
}

export interface PublicConfig {
  network: "testnet" | "mainnet";
  /** Handle of the deployment owner's tip jar that gets live tracking with the server key, if any. */
  ownerHandle: string | null;
  payeeName: string | null;
}

export interface RatesResponse {
  usd: number;
  updatedAt: string | null;
}
