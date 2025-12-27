"use client";

import * as React from "react";

type HookResult<T> = {
  data: T | undefined;
  isLoading: boolean;
};

function randomHexAddress() {
  const chars = "0123456789abcdef";
  let out = "0x";
  for (let i = 0; i < 40; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function useAccount(): { address: string | null } {
  const [address, setAddress] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stored = window.localStorage.getItem("artisol:address");
    if (stored) setAddress(stored);
  }, []);

  React.useEffect(() => {
    const handler = () => {
      const stored = window.localStorage.getItem("artisol:address");
      setAddress(stored);
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return { address };
}

export function connectDemoWallet() {
  if (typeof window === "undefined") return;
  const address = randomHexAddress();
  window.localStorage.setItem("artisol:address", address);
}

export type ArtisanStats = {
  nftsMinted: string;
  earnings: string;
  totalRoyalties: string;
  averagePrice: string;
  monthlyGrowth: string;
};

export type PlatformStats = {
  totalNFTs: string;
  totalArtists: string;
  totalCollectors: string;
  totalPlatformValue: string;
};

export type BestNFT = {
  title: string;
  price: string;
};

export function useArtisanStats(_address?: string | null): HookResult<ArtisanStats> {
  const [state, setState] = React.useState<HookResult<ArtisanStats>>({
    data: undefined,
    isLoading: true,
  });

  React.useEffect(() => {
    let alive = true;
    setState({ data: undefined, isLoading: true });
    const t = window.setTimeout(() => {
      if (!alive) return;
      setState({
        isLoading: false,
        data: {
          nftsMinted: "12",
          earnings: "₹ 1,24,500",
          totalRoyalties: "₹ 18,200",
          averagePrice: "₹ 10,375",
          monthlyGrowth: "+32%",
        },
      });
    }, 500);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [_address]);

  return state;
}

export function usePlatformStats(): HookResult<PlatformStats> {
  const [state, setState] = React.useState<HookResult<PlatformStats>>({
    data: undefined,
    isLoading: true,
  });

  React.useEffect(() => {
    let alive = true;
    setState({ data: undefined, isLoading: true });
    const t = window.setTimeout(() => {
      if (!alive) return;
      setState({
        isLoading: false,
        data: {
          totalNFTs: "2,481",
          totalArtists: "607",
          totalCollectors: "1,942",
          totalPlatformValue: "₹ 8,90,10,000",
        },
      });
    }, 500);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, []);

  return state;
}

export function useBestNFT(_address?: string | null): HookResult<BestNFT> {
  const [state, setState] = React.useState<HookResult<BestNFT>>({
    data: undefined,
    isLoading: true,
  });

  React.useEffect(() => {
    let alive = true;
    setState({ data: undefined, isLoading: true });
    const t = window.setTimeout(() => {
      if (!alive) return;
      setState({
        isLoading: false,
        data: {
          title: "Kokri Heritage Saree #014",
          price: "₹ 24,999",
        },
      });
    }, 650);

    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [_address]);

  return state;
}
