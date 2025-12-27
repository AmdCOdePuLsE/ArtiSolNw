import { Contract, providers } from "ethers";

// Purchase status enum matching the contract
export enum PurchaseStatus {
  NONE = 0,       // Not purchased
  ESCROW = 1,     // Buyer paid, waiting for delivery
  DELIVERED = 2,  // Seller marked as delivered
  COMPLETED = 3,  // Buyer confirmed, NFT transferred, funds released
  REFUNDED = 4,   // Buyer refunded
  DISPUTED = 5    // Under dispute
}

export const MARKETPLACE_ABI = [
  // View functions
  {
    type: "function",
    name: "listingCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getListingByIndex",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "seller", type: "address" },
      { name: "priceWei", type: "uint256" },
      { name: "sold", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getListing",
    stateMutability: "view",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [
      { name: "seller", type: "address" },
      { name: "priceWei", type: "uint256" },
      { name: "sold", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getPurchase",
    stateMutability: "view",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [
      { name: "buyer", type: "address" },
      { name: "amountPaid", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "purchaseTime", type: "uint256" },
      { name: "deliveryTime", type: "uint256" },
      { name: "completionTime", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getFullListingInfo",
    stateMutability: "view",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [
      { name: "seller", type: "address" },
      { name: "priceWei", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "buyer", type: "address" },
      { name: "status", type: "uint8" },
      { name: "purchaseTime", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "platformFeeBps",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "autoReleaseTimeout",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Seller functions
  {
    type: "function",
    name: "listItem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "priceWei", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelListing",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "markDelivered",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  // Buyer functions
  {
    type: "function",
    name: "buyItem",
    stateMutability: "payable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "confirmDelivery",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "raiseDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  // Admin functions
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "buyerWins", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "autoRelease",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "emergencyRefund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "nftContract", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  // Events
  {
    type: "event",
    name: "Listed",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "priceWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ListingCancelled",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "Purchased",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "priceWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DeliveryMarked",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "DeliveryConfirmed",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TransactionCompleted",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RefundIssued",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DisputeRaised",
    inputs: [
      { name: "buyer", type: "address", indexed: true },
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "nftContract", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "buyerWins", type: "bool", indexed: false },
    ],
  },
] as const;

export function getMarketplaceAddress() {
  const address = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  if (!address) {
    throw new Error(
      "Missing NEXT_PUBLIC_MARKETPLACE_ADDRESS (set it in .env.local after deploying)",
    );
  }
  return address;
}

export function getMarketplaceReadContract(provider: providers.Provider) {
  return new Contract(getMarketplaceAddress(), MARKETPLACE_ABI, provider);
}

export function getMarketplaceWriteContract(signer: any) {
  return new Contract(getMarketplaceAddress(), MARKETPLACE_ABI, signer);
}

// Helper to get purchase status as string
export function getPurchaseStatusString(status: number): string {
  const statusMap: Record<number, string> = {
    [PurchaseStatus.NONE]: "Not Purchased",
    [PurchaseStatus.ESCROW]: "In Escrow",
    [PurchaseStatus.DELIVERED]: "Delivered",
    [PurchaseStatus.COMPLETED]: "Completed",
    [PurchaseStatus.REFUNDED]: "Refunded",
    [PurchaseStatus.DISPUTED]: "Disputed",
  };
  return statusMap[status] || "Unknown";
}
