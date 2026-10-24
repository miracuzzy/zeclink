"use client";
import { useEffect, useState } from "react";
import type { PublicConfig, RatesResponse } from "./types";

export function useConfig(): PublicConfig | null {
  const [cfg, setCfg] = useState<PublicConfig | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setCfg(j))
      .catch(() => alive && setCfg({ provider: "demo", network: "testnet", payeeName: null }));
    return () => {
      alive = false;
    };
  }, []);
  return cfg;
}

export function useRates(): RatesResponse | null {
  const [r, setR] = useState<RatesResponse | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/rates")
      .then((res) => (res.ok ? res.json() : null))
      .then((j) => alive && setR(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return r;
}

export function useHash(): string | null {
  const [h, setH] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setH(window.location.hash);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return h;
}

export function fmtFiat(zec: number, rate: number | undefined, cur: "USD"): string | null {
  if (!rate || !Number.isFinite(zec)) return null;
  const v = zec * rate;
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 2,
  }).format(v);
}
