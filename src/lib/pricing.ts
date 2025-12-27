"use client";

import * as React from "react";

export function useEthInrRate() {
  const [inrPerEth, setInrPerEth] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr",
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Failed to fetch ETH price");
        const json = (await res.json()) as { ethereum?: { inr?: number } };
        const rate = json.ethereum?.inr;
        if (!cancelled) setInrPerEth(typeof rate === "number" ? rate : null);
      } catch {
        if (!cancelled) setInrPerEth(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { inrPerEth, loading };
}

export function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
