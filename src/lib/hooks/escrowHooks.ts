"use client";

import * as React from "react";
import { getBrowserProvider, getRpcProvider } from "@/lib/web3";
import {
  getMarketplaceReadContract,
  getMarketplaceWriteContract,
  PurchaseStatus,
  getPurchaseStatusString,
} from "@/lib/contracts/marketplace";
import {
  getArtisolNFTWriteContract,
  getArtisolNFTReadContract,
  getArtisolNFTAddress,
} from "@/lib/contracts/artisolNFT";

// Types
export type EscrowPurchase = {
  nftContract: string;
  tokenId: string;
  buyer: string;
  amountPaid: string;
  status: PurchaseStatus;
  statusString: string;
  purchaseTime: Date | null;
  deliveryTime: Date | null;
  completionTime: Date | null;
};

export type ListingWithStatus = {
  nftContract: string;
  tokenId: string;
  seller: string;
  priceWei: string;
  active: boolean;
  purchase: EscrowPurchase | null;
};

// Hook to get wallet connection status
export function useWallet() {
  const [wallet, setWallet] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const connect = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect wallet");
      setWallet(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = React.useCallback(() => {
    setWallet(null);
  }, []);

  // Check for existing connection on mount
  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const eth = (globalThis as any).ethereum;
        if (eth) {
          const accounts = await eth.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            setWallet(accounts[0]);
          }
        }
      } catch {
        // Silently fail
      }
    };
    checkConnection();
  }, []);

  return { wallet, loading, error, connect, disconnect };
}

// Hook to get purchase/escrow details for a specific NFT
export function usePurchaseDetails(nftContract: string, tokenId: string) {
  const [purchase, setPurchase] = React.useState<EscrowPurchase | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    if (!nftContract || !tokenId) return;
    
    setLoading(true);
    setError(null);
    try {
      const provider = (() => {
        try { return getRpcProvider(); }
        catch { return getBrowserProvider(); }
      })();
      
      const contract = getMarketplaceReadContract(provider);
      const result = await contract.getPurchase(nftContract, tokenId);
      
      const status = Number(result.status);
      if (status === PurchaseStatus.NONE) {
        setPurchase(null);
      } else {
        setPurchase({
          nftContract,
          tokenId,
          buyer: result.buyer,
          amountPaid: result.amountPaid.toString(),
          status,
          statusString: getPurchaseStatusString(status),
          purchaseTime: result.purchaseTime > 0 ? new Date(Number(result.purchaseTime) * 1000) : null,
          deliveryTime: result.deliveryTime > 0 ? new Date(Number(result.deliveryTime) * 1000) : null,
          completionTime: result.completionTime > 0 ? new Date(Number(result.completionTime) * 1000) : null,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load purchase details");
      setPurchase(null);
    } finally {
      setLoading(false);
    }
  }, [nftContract, tokenId]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { purchase, loading, error, refetch };
}

// Hook for seller actions
export function useSellerActions() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<string | null>(null);

  // Approve marketplace to transfer NFT
  const approveNFT = React.useCallback(async (tokenId: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const nftContract = getArtisolNFTWriteContract(signer);
      const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
      
      if (!marketplaceAddress) throw new Error("Marketplace address not configured");
      
      const tx = await nftContract.approve(marketplaceAddress, tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to approve NFT";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // List NFT for sale
  const listNFT = React.useCallback(async (tokenId: string, priceWei: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const marketplace = getMarketplaceWriteContract(signer);
      const nftAddress = getArtisolNFTAddress();
      
      const tx = await marketplace.listItem(nftAddress, tokenId, priceWei);
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to list NFT";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel listing
  const cancelListing = React.useCallback(async (tokenId: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const marketplace = getMarketplaceWriteContract(signer);
      const nftAddress = getArtisolNFTAddress();
      
      const tx = await marketplace.cancelListing(nftAddress, tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to cancel listing";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark as delivered
  const markDelivered = React.useCallback(async (nftContract: string, tokenId: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const marketplace = getMarketplaceWriteContract(signer);
      
      const tx = await marketplace.markDelivered(nftContract, tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to mark as delivered";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    txHash,
    approveNFT,
    listNFT,
    cancelListing,
    markDelivered,
  };
}

// Hook for buyer actions
export function useBuyerActions() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<string | null>(null);

  // Buy NFT (escrow payment)
  const buyNFT = React.useCallback(async (nftContract: string, tokenId: string, priceWei: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const marketplace = getMarketplaceWriteContract(signer);
      
      const tx = await marketplace.buyItem(nftContract, tokenId, { value: priceWei });
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to buy NFT";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Confirm delivery (releases escrow)
  const confirmDelivery = React.useCallback(async (nftContract: string, tokenId: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const marketplace = getMarketplaceWriteContract(signer);
      
      const tx = await marketplace.confirmDelivery(nftContract, tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to confirm delivery";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Raise dispute
  const raiseDispute = React.useCallback(async (nftContract: string, tokenId: string) => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      
      const marketplace = getMarketplaceWriteContract(signer);
      
      const tx = await marketplace.raiseDispute(nftContract, tokenId);
      setTxHash(tx.hash);
      await tx.wait();
      
      return { success: true, txHash: tx.hash };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to raise dispute";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    txHash,
    buyNFT,
    confirmDelivery,
    raiseDispute,
  };
}

// Combined full flow hook for demo purposes
export function useEscrowFlow() {
  const wallet = useWallet();
  const sellerActions = useSellerActions();
  const buyerActions = useBuyerActions();

  return {
    wallet,
    seller: sellerActions,
    buyer: buyerActions,
  };
}
