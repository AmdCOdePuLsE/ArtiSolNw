/**
 * Purchase Verification Store
 * Manages the workflow between buyer and seller for NFT transfer
 * 
 * This store works alongside the blockchain escrow system:
 * - Blockchain handles: payment escrow, NFT transfer, fund release
 * - This store handles: UI state, delivery photos, feedback, local persistence
 * 
 * Blockchain Status Mapping:
 * - ESCROW (1) -> "purchased"
 * - DELIVERED (2) -> "delivered"
 * - COMPLETED (3) -> "completed"
 * - REFUNDED (4) -> "buyer_rejected" (refunded)
 * - DISPUTED (5) -> "disputed"
 */

import { PurchaseStatus as BlockchainStatus } from "@/lib/contracts/marketplace";

export type PurchaseStatus =
  | "purchased" // Initial state after payment (blockchain: ESCROW)
  | "delivered" // Product delivered, awaiting buyer feedback (blockchain: DELIVERED)
  | "buyer_confirmed" // Buyer uploaded photos and confirmed product is good
  | "buyer_rejected" // Buyer reported product is bad
  | "seller_approved" // Seller approved buyer's confirmation
  | "disputed" // Issue between buyer and seller (blockchain: DISPUTED)
  | "completed"; // NFT transferred to buyer (blockchain: COMPLETED)

// Delivery address type
export type DeliveryAddress = {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
};

export type Purchase = {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  priceInr: number;
  priceEth: number;
  buyerWallet: string;
  buyerEmail: string;
  sellerWallet: string;
  sellerEmail: string;
  nftContract: string;
  tokenId: string;
  txHash: string;
  status: PurchaseStatus;
  purchaseDate: Date;
  deliveryPhotos: string[]; // Photos uploaded by buyer
  buyerFeedback: string;
  buyerRating: "good" | "bad" | null;
  sellerResponse: string;
  completedDate: Date | null;
  nftTransferTxHash: string | null;
  // Delivery details
  deliveryAddress?: DeliveryAddress;
  // Blockchain sync fields
  blockchainStatus?: BlockchainStatus;
  escrowAmount?: string;
};

// Map blockchain status to local status
export function mapBlockchainStatus(bcStatus: BlockchainStatus): PurchaseStatus {
  switch (bcStatus) {
    case BlockchainStatus.ESCROW:
      return "purchased";
    case BlockchainStatus.DELIVERED:
      return "delivered";
    case BlockchainStatus.COMPLETED:
      return "completed";
    case BlockchainStatus.REFUNDED:
      return "buyer_rejected";
    case BlockchainStatus.DISPUTED:
      return "disputed";
    default:
      return "purchased";
  }
}

const STORAGE_KEY = "artisol_purchases_v1";

// Get all purchases
export function getAllPurchases(): Purchase[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const purchases = JSON.parse(raw) as Purchase[];
    return purchases.map(p => ({
      ...p,
      purchaseDate: new Date(p.purchaseDate),
      completedDate: p.completedDate ? new Date(p.completedDate) : null,
    }));
  } catch {
    return [];
  }
}

// Get purchases for a buyer
export function getBuyerPurchases(buyerEmail: string): Purchase[] {
  return getAllPurchases().filter(p => p.buyerEmail === buyerEmail);
}

// Get purchases for a seller (their sold items)
export function getSellerPurchases(sellerEmail: string): Purchase[] {
  return getAllPurchases().filter(p => p.sellerEmail === sellerEmail);
}

// Get pending approvals for seller
export function getSellerPendingApprovals(sellerEmail: string): Purchase[] {
  return getSellerPurchases(sellerEmail).filter(
    p => p.status === "buyer_confirmed"
  );
}

// Add a new purchase
export function addPurchase(purchase: Omit<Purchase, "id" | "purchaseDate" | "deliveryPhotos" | "buyerFeedback" | "buyerRating" | "sellerResponse" | "completedDate" | "nftTransferTxHash">): Purchase {
  const newPurchase: Purchase = {
    ...purchase,
    id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    purchaseDate: new Date(),
    deliveryPhotos: [],
    buyerFeedback: "",
    buyerRating: null,
    sellerResponse: "",
    completedDate: null,
    nftTransferTxHash: null,
    status: "purchased",
  };
  
  const purchases = getAllPurchases();
  purchases.push(newPurchase);
  savePurchases(purchases);
  return newPurchase;
}

// Update purchase status
export function updatePurchaseStatus(purchaseId: string, status: PurchaseStatus): void {
  const purchases = getAllPurchases();
  const index = purchases.findIndex(p => p.id === purchaseId);
  if (index !== -1) {
    purchases[index].status = status;
    if (status === "completed") {
      purchases[index].completedDate = new Date();
    }
    savePurchases(purchases);
  }
}

// Buyer confirms product with photos and feedback
export function buyerConfirmProduct(
  purchaseId: string,
  photos: string[],
  feedback: string,
  rating: "good" | "bad"
): void {
  const purchases = getAllPurchases();
  const index = purchases.findIndex(p => p.id === purchaseId);
  if (index !== -1) {
    purchases[index].deliveryPhotos = photos;
    purchases[index].buyerFeedback = feedback;
    purchases[index].buyerRating = rating;
    purchases[index].status = rating === "good" ? "buyer_confirmed" : "buyer_rejected";
    savePurchases(purchases);
  }
}

// Seller approves and triggers NFT transfer
export function sellerApprove(purchaseId: string, response: string, nftTxHash: string): void {
  const purchases = getAllPurchases();
  const index = purchases.findIndex(p => p.id === purchaseId);
  if (index !== -1) {
    purchases[index].sellerResponse = response;
    purchases[index].nftTransferTxHash = nftTxHash;
    purchases[index].status = "completed";
    purchases[index].completedDate = new Date();
    savePurchases(purchases);
  }
}

// Mark as delivered
export function markAsDelivered(purchaseId: string): void {
  updatePurchaseStatus(purchaseId, "delivered");
}

// Save purchases to storage
function savePurchases(purchases: Purchase[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
}

// Generate demo purchases for testing
export function generateDemoPurchases(buyerEmail: string): Purchase[] {
  const existing = getBuyerPurchases(buyerEmail);
  if (existing.length > 0) return existing;
  
  const demoPurchases: Purchase[] = [
    {
      id: "demo_1",
      productId: "prod_1",
      productName: "Banarasi Silk Saree",
      productImage: "/saree.jpg",
      category: "Textile & Fabric",
      priceInr: 15000,
      priceEth: 0.05,
      buyerWallet: "0x1234...5678",
      buyerEmail: buyerEmail,
      sellerWallet: "0xABCD...EFGH",
      sellerEmail: "seller@artisol.com",
      nftContract: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      tokenId: "1001",
      txHash: "0xabc123def456789",
      status: "delivered",
      purchaseDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      deliveryPhotos: [],
      buyerFeedback: "",
      buyerRating: null,
      sellerResponse: "",
      completedDate: null,
      nftTransferTxHash: null,
    },
    {
      id: "demo_2",
      productId: "prod_2",
      productName: "Kalamkari Painting",
      productImage: "/painting.jpg",
      category: "Painting & Art",
      priceInr: 8500,
      priceEth: 0.03,
      buyerWallet: "0x1234...5678",
      buyerEmail: buyerEmail,
      sellerWallet: "0xABCD...EFGH",
      sellerEmail: "seller@artisol.com",
      nftContract: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      tokenId: "1002",
      txHash: "0xdef456abc789123",
      status: "buyer_confirmed",
      purchaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      deliveryPhotos: ["/painting.jpg"],
      buyerFeedback: "Product received in excellent condition. Very happy with the quality!",
      buyerRating: "good",
      sellerResponse: "",
      completedDate: null,
      nftTransferTxHash: null,
    },
    {
      id: "demo_3",
      productId: "prod_3",
      productName: "Phulkari Dupatta",
      productImage: "/dupatta.jpg",
      category: "Textile & Fabric",
      priceInr: 4500,
      priceEth: 0.015,
      buyerWallet: "0x1234...5678",
      buyerEmail: buyerEmail,
      sellerWallet: "0xABCD...EFGH",
      sellerEmail: "seller@artisol.com",
      nftContract: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      tokenId: "1003",
      txHash: "0x789123abc456def",
      status: "completed",
      purchaseDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      deliveryPhotos: ["/dupatta.jpg"],
      buyerFeedback: "Beautiful craftsmanship! The colors are vibrant.",
      buyerRating: "good",
      sellerResponse: "Thank you for your kind feedback! Enjoy your purchase.",
      completedDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      nftTransferTxHash: "0xnft123transfer456",
    },
  ];
  
  const purchases = getAllPurchases();
  purchases.push(...demoPurchases);
  savePurchases(purchases);
  return demoPurchases;
}

// Generate demo seller data
export function generateDemoSellerPurchases(sellerEmail: string): Purchase[] {
  const existing = getSellerPurchases(sellerEmail);
  if (existing.length > 0) return existing;
  
  const demoPurchases: Purchase[] = [
    {
      id: "seller_demo_1",
      productId: "sprod_1",
      productName: "Madhubani Art",
      productImage: "/kalamkari.jpg",
      category: "Painting & Art",
      priceInr: 12000,
      priceEth: 0.04,
      buyerWallet: "0x9876...4321",
      buyerEmail: "buyer@test.com",
      sellerWallet: "0xABCD...EFGH",
      sellerEmail: sellerEmail,
      nftContract: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      tokenId: "2001",
      txHash: "0xseller123abc456",
      status: "buyer_confirmed",
      purchaseDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      deliveryPhotos: ["/kalamkari.jpg"],
      buyerFeedback: "Received the artwork in perfect condition. Amazing detail!",
      buyerRating: "good",
      sellerResponse: "",
      completedDate: null,
      nftTransferTxHash: null,
    },
    {
      id: "seller_demo_2",
      productId: "sprod_2",
      productName: "Blue Pottery Vase",
      productImage: "/vase.jpg",
      category: "Pottery & Ceramics",
      priceInr: 6500,
      priceEth: 0.022,
      buyerWallet: "0x5555...6666",
      buyerEmail: "buyer2@test.com",
      sellerWallet: "0xABCD...EFGH",
      sellerEmail: sellerEmail,
      nftContract: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      tokenId: "2002",
      txHash: "0xseller789def012",
      status: "delivered",
      purchaseDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      deliveryPhotos: [],
      buyerFeedback: "",
      buyerRating: null,
      sellerResponse: "",
      completedDate: null,
      nftTransferTxHash: null,
    },
  ];
  
  const purchases = getAllPurchases();
  purchases.push(...demoPurchases);
  savePurchases(purchases);
  return demoPurchases;
}
