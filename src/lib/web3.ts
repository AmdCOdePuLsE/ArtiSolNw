import { providers } from "ethers";

// Fallback RPC URL for Sepolia testnet (in case env var is not set)
const FALLBACK_RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/hgBu-UD8N-2ZoBs_Ts17o";

export function getRpcProvider() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || FALLBACK_RPC_URL;
  console.log("Using RPC URL:", rpcUrl ? rpcUrl.substring(0, 40) + "..." : "MISSING");
  return new providers.JsonRpcProvider(rpcUrl);
}

export function getBrowserProvider() {
  // Check multiple possible locations for ethereum provider
  const ethereum = 
    (window as any).ethereum || 
    (globalThis as any).ethereum ||
    (window as any).web3?.currentProvider;
  
  if (!ethereum) {
    throw new Error(
      "No wallet found. Please install MetaMask extension and refresh the page."
    );
  }
  return new providers.Web3Provider(ethereum);
}

// Check if wallet is available (without throwing)
export function isWalletAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).ethereum || 
    (globalThis as any).ethereum ||
    (window as any).web3?.currentProvider
  );
}

// Request wallet connection
export async function connectWallet(): Promise<string | null> {
  try {
    const provider = getBrowserProvider();
    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0] || null;
  } catch (error) {
    console.error("Wallet connection error:", error);
    return null;
  }
}

