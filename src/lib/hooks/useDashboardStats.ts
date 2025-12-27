/**
 * Stub hooks for demo — actual implementation would call RPC / indexer.
 */

export type ArtisanStats = {
  nftsMinted: number;
  totalEarnings: string;
  totalRoyalties: string;
  averagePrice: string;
};

export type PlatformStats = {
  totalNFTs: number;
  totalArtists: number;
  totalCollectors: number;
  totalPlatformValue: string;
};

export type BestNFT = {
  title: string;
  price: string;
  tokenId: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function useArtisanStats(_address?: string | null) {
  const data: ArtisanStats = {
    nftsMinted: 12,
    totalEarnings: "₹1,23,400",
    totalRoyalties: "₹15,800",
    averagePrice: "₹10,283",
  };
  return { data, isLoading: false, mutate: () => Promise.resolve() };
}

export function usePlatformStats() {
  const data: PlatformStats = {
    totalNFTs: 4_832,
    totalArtists: 720,
    totalCollectors: 3_150,
    totalPlatformValue: "₹2,18,45,000",
  };
  return { data, isLoading: false };
}

export function useBestNFT(_address?: string | null) {
  const data: BestNFT = {
    title: "Silk Saree #342",
    price: "₹24,000",
    tokenId: "342",
  };
  return { data, isLoading: false };
}
