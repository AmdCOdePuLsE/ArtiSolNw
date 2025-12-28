"use client";
// Build fix: 2025-12-28 10:25

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShoppingCart,
  Shield,
  CheckCircle,
  Eye,
  User,
  Tag,
  Hash,
  FileText,
  Award,
  Clock,
  MapPin,
  Package,
  Upload,
  Image as ImageIcon,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Camera,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatInr, useEthInrRate } from "@/lib/pricing";
import { getBrowserProvider, getRpcProvider } from "@/lib/web3";
import {
  getMarketplaceReadContract,
  getMarketplaceWriteContract,
  PurchaseStatus,
} from "@/lib/contracts/marketplace";
import { utils as ethersUtils } from "ethers";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/session";
import {
  Purchase,
  DeliveryAddress,
  getBuyerPurchases,
  generateDemoPurchases,
  buyerConfirmProduct,
  buyerConfirmDeliveryWithTx,
  addPurchase,
} from "@/lib/purchaseStore";

type NFTMetadata = {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string }>;
};

type Listing = {
  index: number;
  nftContract: string;
  tokenId: bigint;
  seller: string;
  priceWei: bigint;
  sold: boolean;
  // Real metadata from blockchain
  metadata?: NFTMetadata;
};

// Blockchain purchase type (from contract directly)
type BlockchainPurchase = {
  nftContract: string;
  tokenId: string;
  seller: string;
  buyer: string;
  priceWei: bigint;
  priceEth: string;
  status: PurchaseStatus;
  purchaseTime: number;
  metadata?: NFTMetadata;
};

// Parse tokenURI to get metadata
function parseTokenURI(tokenURI: string): NFTMetadata | null {
  try {
    if (tokenURI.startsWith("data:application/json;base64,")) {
      const base64 = tokenURI.replace("data:application/json;base64,", "");
      const jsonString = atob(base64);
      return JSON.parse(jsonString) as NFTMetadata;
    }
    // Handle IPFS or HTTP URIs if needed in future
    return null;
  } catch (e) {
    console.error("Failed to parse tokenURI:", e);
    return null;
  }
}

// Mock product details for demo
const mockProductDetails: Record<
  string,
  {
    name: string;
    image: string;
    category: string;
    description: string;
    origin: string;
    craftsman: string;
    materials: string;
    createdDate: string;
    certificateId: string;
  }
> = {
  default: {
    name: "Handcrafted Banarasi Silk Saree",
    image: "",
    category: "Textile",
    description:
      "This exquisite Banarasi silk saree is handwoven by master artisans using traditional techniques passed down through generations. Features intricate zari work with real gold and silver threads, depicting classical Mughal-inspired motifs.",
    origin: "Varanasi, Uttar Pradesh",
    craftsman: "Master Weaver Ramesh Kumar",
    materials: "Pure Silk, Zari (Gold/Silver threads)",
    createdDate: "November 2024",
    certificateId: "ARTISOL-2024-BNR",
  },
};

const productNames = [
  "Banarasi Silk Saree",
  "Kalamkari Painting",
  "Channapatna Wooden Toy",
  "Phulkari Dupatta",
  "Blue Pottery Vase",
  "Madhubani Art",
  "Pashmina Shawl",
  "Bidri Craft Box",
];

// Product images mapping
const productImages: Record<string, string> = {
  "Banarasi Silk Saree": "/saree.jpg",
  "Kalamkari Painting": "/painting.jpg",
  "Channapatna Wooden Toy": "/wood.jpg",
  "Phulkari Dupatta": "/dupatta.jpg",
  "Blue Pottery Vase": "/vase.jpg",
  "Madhubani Art": "/kalamkari.jpg",
};

// Get product details - use real metadata if available, fallback to demo
function getProductForListing(listing: Listing) {
  // If we have real metadata from blockchain, use it
  if (listing.metadata) {
    const category = listing.metadata.attributes?.find(a => a.trait_type === "Category")?.value || "Handicraft";
    const priceInr = listing.metadata.attributes?.find(a => a.trait_type === "Price (INR)")?.value || "";
    const artisan = listing.metadata.attributes?.find(a => a.trait_type === "Artisan")?.value || "";
    
    // Check if image is a valid URL (not a blob: URL which won't work across browsers)
    let imageUrl = listing.metadata.image || null;
    if (imageUrl && (imageUrl.startsWith("blob:") || imageUrl.startsWith("data:image"))) {
      // Blob URLs are temporary and won't work for buyers
      // Use null to show placeholder instead
      imageUrl = null;
    }
    
    return {
      name: listing.metadata.name || "Artisan Product",
      image: imageUrl,
      category: category,
      description: listing.metadata.description || "Handcrafted authentic product from Indian artisans.",
      origin: "India",
      craftsman: artisan ? shortenAddress(artisan) : "Verified Artisan",
      materials: "Authentic Materials",
      createdDate: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      certificateId: `ARTISOL-${listing.tokenId.toString()}`,
      priceInr: priceInr,
    };
  }
  
  // Fallback to demo data for demo listings
  const base = mockProductDetails.default;
  const name = productNames[listing.index % productNames.length];
  return {
    ...base,
    name,
    image: productImages[name] || null,
  };
}

function shortenAddress(addr: string) {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function blurNftCode(code: string) {
  if (code.length <= 8) return code.slice(0, 4) + "••••";
  return code.slice(0, 6) + "••••••" + code.slice(-4);
}

export default function BuyerMarketplacePage() {
  const session = getSession();
  const { inrPerEth, loading } = useEthInrRate();
  const [wallet, setWallet] = React.useState<string | null>(null);
  const [walletError, setWalletError] = React.useState<string | null>(null);
  const [marketError, setMarketError] = React.useState<string | null>(null);
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = React.useState(false);
  const [buyingIndex, setBuyingIndex] = React.useState<number | null>(null);
  const [selectedListing, setSelectedListing] = React.useState<Listing | null>(
    null
  );

  // Tab state
  const [activeTab, setActiveTab] = React.useState<"marketplace" | "profile">("marketplace");

  // My Purchases state
  const [myPurchases, setMyPurchases] = React.useState<Purchase[]>([]);
  
  // Blockchain purchases state (fetched directly from contract)
  const [blockchainPurchases, setBlockchainPurchases] = React.useState<BlockchainPurchase[]>([]);
  const [loadingBlockchainPurchases, setLoadingBlockchainPurchases] = React.useState(false);
  
  // Selected blockchain purchase for confirm modal
  const [selectedBlockchainPurchase, setSelectedBlockchainPurchase] = React.useState<BlockchainPurchase | null>(null);
  
  // Transaction details for showing fund transfer
  const [transactionDetails, setTransactionDetails] = React.useState<{
    txHash: string;
    sellerAddress: string;
    sellerBalanceBefore: string;
    sellerBalanceAfter: string;
    amountReleased: string;
    platformFee: string;
    netToSeller: string;
  } | null>(null);
  
  // Feedback modal state
  const [feedbackPurchase, setFeedbackPurchase] = React.useState<Purchase | null>(null);
  const [feedbackPhotos, setFeedbackPhotos] = React.useState<string[]>([]);
  const [feedbackText, setFeedbackText] = React.useState("");
  const [feedbackRating, setFeedbackRating] = React.useState<"good" | "bad" | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = React.useState(false);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [confirmStep, setConfirmStep] = React.useState<"upload" | "terms" | "confirm">("upload");

  // Checkout modal state
  const [checkoutListing, setCheckoutListing] = React.useState<Listing | null>(null);
  const [checkoutStep, setCheckoutStep] = React.useState<"address" | "payment" | "success">("address");
  const [deliveryAddress, setDeliveryAddress] = React.useState<DeliveryAddress>({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
  });
  const [addressErrors, setAddressErrors] = React.useState<Partial<Record<keyof DeliveryAddress, string>>>({});
  const [isProcessingPayment, setIsProcessingPayment] = React.useState(false);
  const [paymentTxHash, setPaymentTxHash] = React.useState<string | null>(null);

  // Load purchases
  React.useEffect(() => {
    if (session?.email) {
      generateDemoPurchases(session.email);
      setMyPurchases(getBuyerPurchases(session.email));
    }
  }, [session?.email]);

  // Refresh purchases
  const refreshPurchases = () => {
    if (session?.email) {
      setMyPurchases(getBuyerPurchases(session.email));
    }
  };

  // Fetch blockchain purchases for buyer
  const fetchBlockchainPurchases = React.useCallback(async () => {
    if (!wallet) return;
    
    setLoadingBlockchainPurchases(true);
    try {
      const provider = getRpcProvider();
      const contract = getMarketplaceReadContract(provider);
      
      // Get all listings and check which ones this buyer has purchased
      const count = await contract.listingCount();
      const purchases: BlockchainPurchase[] = [];
      
      for (let i = 0; i < Number(count); i++) {
        const listing = await contract.getListingByIndex(i);
        const nftContract = listing[0];
        const tokenId = listing[1];
        
        // Get purchase info
        const purchaseInfo = await contract.getPurchase(nftContract, tokenId);
        const buyer = purchaseInfo[0];
        const status = Number(purchaseInfo[1]) as PurchaseStatus;
        const purchaseTime = Number(purchaseInfo[2]);
        
        // Only include purchases where this wallet is the buyer and status > 0
        if (buyer.toLowerCase() === wallet.toLowerCase() && status > 0) {
          const seller = listing[2];
          const priceWei = listing[3];
          
          // Fetch NFT metadata
          let metadata: NFTMetadata | undefined;
          try {
            const nftAbi = ["function tokenURI(uint256 tokenId) view returns (string)"];
            const nftContract2 = new (await import("ethers")).Contract(nftContract, nftAbi, provider);
            const tokenURI = await nftContract2.tokenURI(tokenId);
            metadata = parseTokenURI(tokenURI) || undefined;
          } catch (e) {
            console.log("Failed to fetch NFT metadata:", e);
          }
          
          purchases.push({
            nftContract,
            tokenId: tokenId.toString(),
            seller,
            buyer,
            priceWei,
            priceEth: ethersUtils.formatEther(priceWei),
            status,
            purchaseTime,
            metadata,
          });
        }
      }
      
      setBlockchainPurchases(purchases);
      console.log("Found", purchases.length, "blockchain purchases for buyer");
    } catch (e) {
      console.error("Failed to fetch blockchain purchases:", e);
    } finally {
      setLoadingBlockchainPurchases(false);
    }
  }, [wallet]);

  // Load blockchain purchases when wallet connects
  React.useEffect(() => {
    if (wallet) {
      fetchBlockchainPurchases();
    }
  }, [wallet, fetchBlockchainPurchases]);

  // Handle photo upload for feedback
  const handleFeedbackPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const urls = files.map((file) => URL.createObjectURL(file));
    setFeedbackPhotos((prev) => [...prev, ...urls]);
  };

  // Remove feedback photo
  const removeFeedbackPhoto = (index: number) => {
    setFeedbackPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit feedback - this triggers blockchain confirmDelivery
  const handleSubmitFeedback = async () => {
    if (!feedbackPurchase || feedbackPhotos.length === 0 || !termsAccepted) return;
    
    if (!wallet) {
      setMarketError("Please connect your wallet first");
      return;
    }
    
    setIsSubmittingFeedback(true);
    
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      
      // Check network
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              }],
            });
          }
        }
        setIsSubmittingFeedback(false);
        setMarketError("Network switched to Sepolia. Please try again.");
        return;
      }
      
      const signer = await provider.getSigner();
      const contract = getMarketplaceWriteContract(signer);
      
      // Call confirmDelivery on the blockchain - this triggers NFT transfer and fund release
      const tx = await contract.confirmDelivery(
        feedbackPurchase.nftContract, 
        BigInt(feedbackPurchase.tokenId)
      );
      await tx.wait();
      
      // Update local store
      buyerConfirmDeliveryWithTx(
        feedbackPurchase.id,
        feedbackPhotos,
        feedbackText,
        termsAccepted,
        tx.hash
      );
      
      refreshPurchases();
      setConfirmStep("confirm"); // Show success state
      
      // Auto close after showing success
      setTimeout(() => {
        resetFeedbackModal();
      }, 3000);
    } catch (e) {
      console.error("Failed to confirm delivery:", e);
      setMarketError(e instanceof Error ? e.message : "Failed to confirm delivery");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Reset feedback modal
  const resetFeedbackModal = () => {
    setFeedbackPurchase(null);
    setFeedbackPhotos([]);
    setFeedbackText("");
    setFeedbackRating(null);
    setTermsAccepted(false);
    setConfirmStep("upload");
    setSelectedBlockchainPurchase(null);
    setTransactionDetails(null);
  };

  // Handle blockchain purchase confirmation (from contract directly)
  const handleBlockchainConfirmDelivery = async () => {
    if (!selectedBlockchainPurchase || feedbackPhotos.length === 0 || !termsAccepted) return;
    
    if (!wallet) {
      setMarketError("Please connect your wallet first");
      return;
    }
    
    setIsSubmittingFeedback(true);
    setTransactionDetails(null);
    
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      
      // Check network
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        try {
          await (window as unknown as { ethereum: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }],
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number }).code === 4902) {
            await (window as unknown as { ethereum: { request: (args: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              }],
            });
          }
        }
        setIsSubmittingFeedback(false);
        setMarketError("Network switched to Sepolia. Please try again.");
        return;
      }
      
      const signer = await provider.getSigner();
      const contract = getMarketplaceWriteContract(signer);
      
      // Get seller balance BEFORE confirmation
      const sellerAddress = selectedBlockchainPurchase.seller;
      const sellerBalanceBefore = await provider.getBalance(sellerAddress);
      
      // Calculate expected amounts (2.5% platform fee)
      const priceWei = selectedBlockchainPurchase.priceWei;
      const platformFee = (priceWei * BigInt(25)) / BigInt(1000); // 2.5%
      const netToSeller = priceWei - platformFee;
      
      // Call confirmDelivery on the blockchain - this triggers NFT transfer and fund release
      const tx = await contract.confirmDelivery(
        selectedBlockchainPurchase.nftContract, 
        BigInt(selectedBlockchainPurchase.tokenId)
      );
      await tx.wait();
      
      // Get seller balance AFTER confirmation
      const sellerBalanceAfter = await provider.getBalance(sellerAddress);
      
      // Save transaction details for display
      setTransactionDetails({
        txHash: tx.hash,
        sellerAddress,
        sellerBalanceBefore: ethersUtils.formatEther(sellerBalanceBefore),
        sellerBalanceAfter: ethersUtils.formatEther(sellerBalanceAfter),
        amountReleased: ethersUtils.formatEther(priceWei),
        platformFee: ethersUtils.formatEther(platformFee),
        netToSeller: ethersUtils.formatEther(netToSeller),
      });
      
      // Refresh blockchain purchases
      await fetchBlockchainPurchases();
      setConfirmStep("confirm"); // Show success state
      
      // Don't auto close - let user see the details
    } catch (e) {
      console.error("Failed to confirm delivery:", e);
      setMarketError(e instanceof Error ? e.message : "Failed to confirm delivery");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  // Checkout functions
  const validateAddress = (): boolean => {
    const errors: Partial<Record<keyof DeliveryAddress, string>> = {};
    
    if (!deliveryAddress.fullName.trim()) {
      errors.fullName = "Full name is required";
    }
    if (!deliveryAddress.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^[6-9]\d{9}$/.test(deliveryAddress.phone.replace(/\s/g, ""))) {
      errors.phone = "Enter a valid 10-digit mobile number";
    }
    if (!deliveryAddress.addressLine1.trim()) {
      errors.addressLine1 = "Address is required";
    }
    if (!deliveryAddress.city.trim()) {
      errors.city = "City is required";
    }
    if (!deliveryAddress.state.trim()) {
      errors.state = "State is required";
    }
    if (!deliveryAddress.pincode.trim()) {
      errors.pincode = "Pincode is required";
    } else if (!/^\d{6}$/.test(deliveryAddress.pincode)) {
      errors.pincode = "Enter a valid 6-digit pincode";
    }
    
    setAddressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (validateAddress()) {
      setCheckoutStep("payment");
    }
  };

  const handleConfirmPayment = async () => {
    // Check if wallet is connected
    if (!wallet) {
      setMarketError("Please connect your wallet first");
      return;
    }
    
    if (!checkoutListing) {
      setMarketError("No product selected");
      return;
    }
    
    setIsProcessingPayment(true);
    setMarketError(null);
    
    try {
      const provider = getBrowserProvider();
      
      // Request account access to ensure wallet is connected
      await provider.send("eth_requestAccounts", []);
      
      // Check if we're on Sepolia network (chainId 11155111)
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        // Try to switch to Sepolia
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0xaa36a7" }], // 11155111 in hex
          });
        } catch (switchError: any) {
          // If Sepolia is not added, add it
          if (switchError.code === 4902) {
            await (window as any).ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              }],
            });
          } else {
            throw new Error("Please switch to Sepolia testnet in MetaMask");
          }
        }
        // Re-get provider after network switch
        setMarketError("Network switched to Sepolia. Please try again.");
        setIsProcessingPayment(false);
        return;
      }
      
      const signer = await provider.getSigner();
      const contract = getMarketplaceWriteContract(signer);
      
      const tx = await contract.buyItem(checkoutListing.nftContract, checkoutListing.tokenId, {
        value: checkoutListing.priceWei,
      });
      
      await tx.wait();
      setPaymentTxHash(tx.hash);
      
      // Add purchase to store with delivery address
      const product = getProductForListing(checkoutListing);
      const priceEth = Number(ethersUtils.formatEther(checkoutListing.priceWei));
      const inr = inrPerEth ? priceEth * inrPerEth : priceEth * 250000;
      
      addPurchase({
        productId: `${checkoutListing.nftContract}-${checkoutListing.tokenId.toString()}`,
        productName: product.name,
        productImage: product.image || "",
        category: product.category,
        priceInr: inr,
        priceEth: priceEth,
        buyerWallet: wallet,
        buyerEmail: session?.email || "",
        sellerWallet: checkoutListing.seller,
        sellerEmail: "", // Will be matched by seller wallet
        nftContract: checkoutListing.nftContract,
        tokenId: checkoutListing.tokenId.toString(),
        txHash: tx.hash,
        status: "purchased",
        deliveryAddress: deliveryAddress,
      });
      
      refreshPurchases();
      setCheckoutStep("success");
      await loadListings();
    } catch (e) {
      setMarketError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetCheckoutModal = () => {
    setCheckoutListing(null);
    setCheckoutStep("address");
    setDeliveryAddress({
      fullName: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      pincode: "",
    });
    setAddressErrors({});
    setPaymentTxHash(null);
    setSelectedListing(null);
  };

  const handleBuyNowClick = (listing: Listing) => {
    if (!wallet) {
      connectWallet();
      return;
    }
    setCheckoutListing(listing);
    setCheckoutStep("address");
  };

  async function connectWallet() {
    setWalletError(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setWallet(await signer.getAddress());
    } catch (e) {
      setWallet(null);
      setWalletError(
        e instanceof Error ? e.message : "Failed to connect wallet"
      );
    }
  }

  async function loadListings() {
    setMarketError(null);
    setLoadingListings(true);
    console.log("=== LOADING LISTINGS ===");
    
    try {
      // Use fallback values directly for reliability
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/hgBu-UD8N-2ZoBs_Ts17o";
      const marketplaceAddr = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x278a4E4E067406c2EA1588E19F58957BD543715a";
      const nftContractAddr = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "0x4BF3114037896dEaEAEE3299306C57f2f95aB664";
      
      console.log("RPC URL:", rpcUrl);
      console.log("Marketplace Address:", marketplaceAddr);
      console.log("NFT Contract Address:", nftContractAddr);
      
      // Create provider directly with ethers
      const { providers: ethersProviders, Contract } = await import("ethers");
      const provider = new ethersProviders.JsonRpcProvider(rpcUrl);
      
      // Minimal ABI for listing functions
      const marketplaceAbi = [
        "function listingCount() view returns (uint256)",
        "function getListingByIndex(uint256 index) view returns (address nftContract, uint256 tokenId, address seller, uint256 priceWei, bool sold)"
      ];
      
      // NFT ABI for getting tokenURI
      const nftAbi = [
        "function tokenURI(uint256 tokenId) view returns (string)"
      ];
      
      const marketplaceContract = new Contract(marketplaceAddr, marketplaceAbi, provider);
      const nftContract = new Contract(nftContractAddr, nftAbi, provider);
      
      const count = await marketplaceContract.listingCount();
      const n = Number(count);
      console.log("Found", n, "listings on contract");

      const nextListings: Listing[] = [];
      for (let i = 0; i < n; i++) {
        const row = await marketplaceContract.getListingByIndex(i);
        console.log("Listing", i, ":", {
          nftContract: row.nftContract,
          tokenId: row.tokenId.toString(),
          seller: row.seller,
          priceWei: row.priceWei.toString(),
          sold: row.sold
        });
        
        // Fetch the NFT metadata from tokenURI
        let metadata: NFTMetadata | undefined;
        try {
          const tokenURI = await nftContract.tokenURI(row.tokenId);
          console.log("Token", row.tokenId.toString(), "URI:", tokenURI.substring(0, 50) + "...");
          metadata = parseTokenURI(tokenURI) || undefined;
          if (metadata) {
            console.log("Token", row.tokenId.toString(), "metadata:", metadata.name);
          }
        } catch (e) {
          console.error("Failed to fetch tokenURI for token", row.tokenId.toString(), e);
        }
        
        nextListings.push({
          index: i,
          nftContract: row.nftContract as string,
          tokenId: row.tokenId as bigint,
          seller: row.seller as string,
          priceWei: row.priceWei as bigint,
          sold: row.sold as boolean,
          metadata,
        });
      }

      setListings(nextListings.reverse());
      console.log("Listings loaded successfully:", nextListings.length);
    } catch (e) {
      // If no listings from contract, show demo data
      console.error("Error loading listings:", e);
      setListings([]);
      setMarketError(
        e instanceof Error ? e.message : "Failed to load listings"
      );
    } finally {
      setLoadingListings(false);
    }
  }

  // Demo listings for UI showcase
  const demoListings: Listing[] = React.useMemo(
    () =>
      listings.length > 0
        ? listings
        : Array.from({ length: 6 }, (_, i) => ({
            index: i,
            nftContract: `0x0000000000000000000000000000000000000000`, // Zero address marks as demo
            tokenId: BigInt(1000 + i),
            seller: `0x0000000000000000000000000000000000000000`,
            priceWei: BigInt((0.05 + i * 0.02) * 1e18),
            sold: i === 2,
            isDemo: true, // Mark as demo
          })),
    [listings]
  );

  // Check if a listing is a demo
  const isDemoListing = (listing: Listing) => {
    return listing.nftContract === "0x0000000000000000000000000000000000000000" ||
           listing.seller === "0x0000000000000000000000000000000000000000";
  };

  React.useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleBuy(listing: Listing) {
    setWalletError(null);
    setMarketError(null);
    setBuyingIndex(listing.index);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const contract = getMarketplaceWriteContract(signer);
      const tx = await contract.buyItem(listing.nftContract, listing.tokenId, {
        value: listing.priceWei,
      });
      await tx.wait();
      await loadListings();
      setSelectedListing(null);
    } catch (e) {
      setMarketError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuyingIndex(null);
    }
  }

  return (
    <AuthGuard role="buyer">
      <div 
        className="min-h-screen w-full bg-cover bg-center bg-fixed bg-no-repeat"
        style={{ backgroundImage: "url('/marketplace-bg.jpeg')" }}
      >
        <div className="min-h-screen bg-black/20 backdrop-blur-[1px]">
          <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white md:text-3xl drop-shadow-lg">
                  {activeTab === "marketplace" ? "Marketplace" : "My Profile"}
                </h1>
                <p className="mt-2 text-white/90 drop-shadow">
                  {activeTab === "marketplace" 
                    ? "Discover authentic handcrafted NFTs from verified artisans"
                    : "View your purchases and provide feedback"}
                </p>
              </div>

              <div className="flex flex-col items-start gap-2 sm:items-end">
                {wallet ? (
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-slate-600">Connected:</span>
                    <span className="font-medium text-slate-900">
                      {shortenAddress(wallet)}
                    </span>
                  </div>
                ) : (
                  <Button onClick={connectWallet} className="bg-white text-slate-900 hover:bg-white/90">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </Button>
                )}
                {walletError && (
                  <div className="text-xs text-red-300">{walletError}</div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-8 flex gap-2">
              <button
                onClick={() => setActiveTab("marketplace")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300",
                  activeTab === "marketplace"
                    ? "bg-white text-slate-900 shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                Marketplace
              </button>
              <button
                onClick={() => setActiveTab("profile")}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-300",
                  activeTab === "profile"
                    ? "bg-white text-slate-900 shadow-lg"
                    : "bg-white/20 text-white hover:bg-white/30"
                )}
              >
                <User className="h-4 w-4" />
                My Profile
                {myPurchases.filter(p => p.status === "delivered").length > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                    {myPurchases.filter(p => p.status === "delivered").length}
                  </span>
                )}
              </button>
            </div>

            {/* Marketplace Tab Content */}
            {activeTab === "marketplace" && (
              <>
                {/* Refresh bar */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-white/80">
                    {loadingListings ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading blockchain listings...
                      </span>
                    ) : listings.length > 0 ? (
                      <span className="text-green-300">✓ {listings.length} authentic NFT{listings.length !== 1 ? 's' : ''} from blockchain</span>
                    ) : (
                      <span className="text-amber-300">Showing demo listings (no blockchain listings yet)</span>
                    )}
                  </div>
                  <Button
                    onClick={() => loadListings()}
                    disabled={loadingListings}
                    className="bg-white/20 text-white hover:bg-white/30 border-0"
                  >
                    {loadingListings ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                        <path d="M16 21h5v-5"/>
                      </svg>
                    )}
                    Refresh
                  </Button>
                </div>

                {marketError && (
                  <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {marketError} — Showing demo listings
                  </div>
                )}

                {/* Product Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {demoListings.map((listing) => {
                    const product = getProductForListing(listing);
                    const priceEth = Number(ethersUtils.formatEther(listing.priceWei));
                    const inr = inrPerEth ? priceEth * inrPerEth : null;
                    const nftCode = `${listing.nftContract.slice(0, 10)}...${listing.tokenId.toString()}`;

                    return (
                      <motion.div
                        key={`${listing.nftContract}-${listing.tokenId.toString()}-${listing.index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: listing.index * 0.05 }}
                        whileHover={{ y: -4, scale: 1.01 }}
                className={cn(
                  "group cursor-pointer overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300",
                  "border-slate-200 hover:border-[#0D7B7A]/30 hover:shadow-lg hover:shadow-[#0D7B7A]/10"
                )}
                onClick={() => setSelectedListing(listing)}
              >
                {/* Product Image */}
                <div className={cn(
                  "relative aspect-square overflow-hidden",
                  product.image ? "bg-slate-100" : "bg-gradient-to-br from-[#0D7B7A]/10 via-slate-50 to-[#D4A574]/20"
                )}>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-6xl opacity-30">🎨</div>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute left-3 top-3">
                    <Badge
                      className={cn(
                        "border-0 px-2.5 py-1",
                        listing.sold
                          ? "bg-slate-800 text-white"
                          : "bg-green-500 text-white"
                      )}
                    >
                      {listing.sold ? "Sold" : "Available"}
                    </Badge>
                  </div>
                  {/* Quick View */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="secondary" className="gap-2">
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4">
                  {/* Product Name */}
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {product.name}
                  </h3>

                  {/* Seller */}
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span className="truncate">
                      {shortenAddress(listing.seller)}
                    </span>
                  </div>

                  {/* NFT Code (Blurred) */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-mono text-xs text-slate-400">
                      {blurNftCode(nftCode)}
                    </span>
                    <Shield className="h-3.5 w-3.5 text-[#0D7B7A]" />
                  </div>

                  {/* Price */}
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs text-slate-500">Price</div>
                      <div className="text-lg font-bold text-slate-900">
                        {priceEth.toFixed(3)} ETH
                      </div>
                      <div className="text-xs text-slate-500">
                        {loading
                          ? "..."
                          : inr
                            ? formatInr(inr)
                            : "—"}
                      </div>
                    </div>

                    {/* Buy Button */}
                    <Button
                      size="sm"
                      disabled={listing.sold || buyingIndex === listing.index || isDemoListing(listing)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isDemoListing(listing)) {
                          handleBuyNowClick(listing);
                        }
                      }}
                      className="gap-1.5"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {isDemoListing(listing)
                        ? "Demo Only"
                        : listing.sold
                          ? "Sold"
                          : buyingIndex === listing.index
                            ? "..."
                            : "Buy Now"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedListing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={() => setSelectedListing(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedListing(null)}
                  className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 shadow-md backdrop-blur transition hover:bg-slate-100"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>

                <div className="grid md:grid-cols-2">
                  {/* Image Section */}
                  {(() => {
                    const product = getProductForListing(selectedListing);
                    const hasImage = !!product.image;
                    return (
                      <div className={cn(
                        "relative aspect-square md:aspect-auto md:min-h-[500px]",
                        hasImage ? "bg-slate-100" : "bg-gradient-to-br from-[#0D7B7A]/15 via-slate-50 to-[#D4A574]/25"
                      )}>
                        {hasImage && product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={product.name}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-8xl opacity-40">🎨</div>
                          </div>
                        )}
                        <div className="absolute left-4 top-4">
                          <Badge
                            className={cn(
                              "border-0 px-3 py-1.5 text-sm",
                              selectedListing.sold
                                ? "bg-slate-800 text-white"
                                : "bg-green-500 text-white"
                            )}
                          >
                            {selectedListing.sold ? "Sold" : "Available"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Details Section */}
                  <div className="p-6 md:p-8">
                    {(() => {
                      const product = getProductForListing(
                        selectedListing
                      );
                      const priceEth = Number(
                        ethersUtils.formatEther(selectedListing.priceWei)
                      );
                      const inr = inrPerEth ? priceEth * inrPerEth : null;
                      const fullNftCode = `${selectedListing.nftContract}-${selectedListing.tokenId.toString()}`;

                      return (
                        <>
                          <div className="mb-1 text-sm font-medium text-[#0D7B7A]">
                            {product.category}
                          </div>
                          <h2 className="text-2xl font-bold text-slate-900">
                            {product.name}
                          </h2>

                          {/* Price */}
                          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm text-slate-500">
                              Current Price
                            </div>
                            <div className="mt-1 text-2xl font-bold text-slate-900">
                              {priceEth.toFixed(4)} ETH
                            </div>
                            <div className="text-sm text-slate-500">
                              {loading
                                ? "Fetching INR..."
                                : inr
                                  ? `≈ ${formatInr(inr)}`
                                  : "—"}
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mt-6">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <FileText className="h-4 w-4 text-slate-500" />
                              Description
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">
                              {product.description}
                            </p>
                          </div>

                          {/* Authenticity Details */}
                          <div className="mt-6">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <Shield className="h-4 w-4 text-[#0D7B7A]" />
                              Authenticity & Provenance
                            </h3>
                            <div className="mt-3 space-y-2">
                              <div className="flex items-start gap-3 rounded-xl bg-[#0D7B7A]/5 p-3">
                                <User className="mt-0.5 h-4 w-4 text-[#0D7B7A]" />
                                <div>
                                  <div className="text-xs text-slate-500">
                                    Artisan / Seller
                                  </div>
                                  <div className="font-mono text-sm text-slate-900">
                                    {selectedListing.seller}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 rounded-xl bg-[#0D7B7A]/5 p-3">
                                <Hash className="mt-0.5 h-4 w-4 text-[#0D7B7A]" />
                                <div>
                                  <div className="text-xs text-slate-500">
                                    NFT Contract & Token ID
                                  </div>
                                  <div className="break-all font-mono text-sm text-slate-900">
                                    {fullNftCode}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 rounded-xl bg-[#0D7B7A]/5 p-3">
                                <MapPin className="mt-0.5 h-4 w-4 text-[#0D7B7A]" />
                                <div>
                                  <div className="text-xs text-slate-500">
                                    Origin
                                  </div>
                                  <div className="text-sm text-slate-900">
                                    {product.origin}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 rounded-xl bg-[#0D7B7A]/5 p-3">
                                <Award className="mt-0.5 h-4 w-4 text-[#0D7B7A]" />
                                <div>
                                  <div className="text-xs text-slate-500">
                                    Materials
                                  </div>
                                  <div className="text-sm text-slate-900">
                                    {product.materials}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-3 rounded-xl bg-[#0D7B7A]/5 p-3">
                                <Clock className="mt-0.5 h-4 w-4 text-[#0D7B7A]" />
                                <div>
                                  <div className="text-xs text-slate-500">
                                    Created
                                  </div>
                                  <div className="text-sm text-slate-900">
                                    {product.createdDate}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Verified Badge */}
                          <div className="mt-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <div className="text-sm font-medium text-green-800">
                                Verified on Blockchain
                              </div>
                              <div className="text-xs text-green-600">
                                Certificate ID: {product.certificateId}-
                                {selectedListing.tokenId.toString()}
                              </div>
                            </div>
                          </div>

                          {/* Buy Button */}
                          <div className="mt-6">
                            <Button
                              className="w-full gap-2 py-3"
                              disabled={
                                selectedListing.sold ||
                                buyingIndex === selectedListing.index ||
                                isDemoListing(selectedListing)
                              }
                              onClick={() => {
                                if (!isDemoListing(selectedListing)) {
                                  handleBuyNowClick(selectedListing);
                                }
                              }}
                            >
                              <ShoppingCart className="h-4 w-4" />
                              {isDemoListing(selectedListing)
                                ? "Demo Product - Cannot Purchase"
                                : selectedListing.sold
                                  ? "This item has been sold"
                                  : buyingIndex === selectedListing.index
                                    ? "Processing..."
                                    : wallet
                                      ? `Buy Now for ${priceEth.toFixed(3)} ETH`
                                      : "Connect Wallet to Buy"}
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
              </>
            )}

            {/* Profile Tab Content */}
            {activeTab === "profile" && (
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Buyer Info Card */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lg:col-span-1"
                >
                  <Card className="relative overflow-hidden border border-[#0D7B7A]/20 bg-gradient-to-br from-white via-teal-50/50 to-[#0D7B7A]/10 shadow-xl">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0D7B7A] via-[#14a8a6] to-[#D4A574]" />
                    
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-slate-800">Buyer Profile</CardTitle>
                      <CardDescription className="text-slate-500">Your account information</CardDescription>
                    </CardHeader>

                    <div className="space-y-4 px-6 pb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Email</span>
                        <span className="font-semibold text-slate-800">{session?.email ?? "—"}</span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Role</span>
                        <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                          Verified Buyer
                        </Badge>
                      </div>

                      <div className="border-t border-slate-200 pt-4">
                        {wallet ? (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Wallet</div>
                            <div className="rounded-xl bg-[#0D7B7A]/10 px-4 py-3 font-mono text-sm text-[#0D7B7A] font-medium border border-[#0D7B7A]/20">
                              {wallet.slice(0, 6)}...{wallet.slice(-4)}
                            </div>
                          </div>
                        ) : (
                          <Button onClick={connectWallet} className="w-full bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6]">
                            Connect Wallet
                          </Button>
                        )}
                      </div>

                      <div className="space-y-3 border-t border-slate-200 pt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Total Purchases</span>
                          <span className="text-lg font-bold text-[#0D7B7A]">{myPurchases.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Pending Feedback</span>
                          <span className="text-lg font-bold text-amber-500">
                            {myPurchases.filter(p => p.status === "delivered").length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">NFTs Received</span>
                          <span className="text-lg font-bold text-emerald-500">
                            {myPurchases.filter(p => p.status === "completed").length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Purchases List */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="lg:col-span-2"
                >
                  <Card className="relative overflow-hidden border border-[#D4A574]/20 bg-gradient-to-br from-white via-amber-50/30 to-[#D4A574]/10 shadow-xl">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A574] via-[#E9C9A8] to-[#0D7B7A]" />
                    
                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-slate-800">My Purchases</CardTitle>
                      <CardDescription className="text-slate-500">Your purchased items and their status</CardDescription>
                    </CardHeader>

                    {myPurchases.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="rounded-full bg-[#D4A574]/10 p-5 border border-[#D4A574]/20">
                          <Package className="h-10 w-10 text-[#D4A574]" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-800">No purchases yet</p>
                        <p className="mt-1 text-sm text-slate-500">Start exploring the marketplace to find unique artisan products</p>
                        <Button 
                          className="mt-4"
                          onClick={() => setActiveTab("marketplace")}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Browse Marketplace
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4 px-6 pb-6">
                        {myPurchases.map((purchase, idx) => (
                          <motion.div
                            key={purchase.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            <div className="flex flex-col sm:flex-row">
                              {/* Product Image */}
                              <div className="relative w-full sm:w-40 aspect-square sm:aspect-auto overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                                {purchase.productImage ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={purchase.productImage}
                                    alt={purchase.productName}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-slate-300" />
                                  </div>
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{purchase.productName}</h3>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{purchase.category}</p>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "shrink-0",
                                      purchase.status === "completed" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                                      purchase.status === "delivered" && "bg-amber-100 text-amber-700 border-amber-200",
                                      purchase.status === "buyer_confirmed" && "bg-blue-100 text-blue-700 border-blue-200",
                                      purchase.status === "purchased" && "bg-blue-100 text-blue-700 border-blue-200",
                                    )}
                                  >
                                    {purchase.status === "completed" && "✓ NFT Received"}
                                    {purchase.status === "delivered" && "📦 Ready to Confirm"}
                                    {purchase.status === "buyer_confirmed" && "📋 Pending Seller Approval"}
                                    {purchase.status === "purchased" && "⏳ Awaiting Shipment"}
                                  </Badge>
                                </div>

                                <div className="mt-3 flex items-center gap-4">
                                  <span className="text-xl font-extrabold text-[#0D7B7A]">
                                    ₹{purchase.priceInr.toLocaleString()}
                                  </span>
                                  <span className="text-sm text-slate-500">
                                    {purchase.priceEth} ETH
                                  </span>
                                </div>

                                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {new Date(purchase.purchaseDate).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Shield className="h-3.5 w-3.5" />
                                    Token #{purchase.tokenId}
                                  </span>
                                </div>

                                {/* Delivery Address */}
                                {purchase.deliveryAddress && (
                                  <div className="mt-3 rounded-lg bg-slate-50 p-3 border border-slate-200">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-1">
                                      <MapPin className="h-3.5 w-3.5 text-[#0D7B7A]" />
                                      Delivery Address
                                    </div>
                                    <div className="text-xs text-slate-600">
                                      <p className="font-medium">{purchase.deliveryAddress.fullName}</p>
                                      <p>{purchase.deliveryAddress.addressLine1}</p>
                                      {purchase.deliveryAddress.addressLine2 && <p>{purchase.deliveryAddress.addressLine2}</p>}
                                      <p>{purchase.deliveryAddress.city}, {purchase.deliveryAddress.state} - {purchase.deliveryAddress.pincode}</p>
                                      <p className="mt-1">📞 {purchase.deliveryAddress.phone}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {purchase.status === "purchased" && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                      <Package className="h-4 w-4" />
                                      Waiting for seller to ship...
                                    </div>
                                  )}
                                  
                                  {purchase.status === "delivered" && (
                                    <Button
                                      size="sm"
                                      onClick={() => setFeedbackPurchase(purchase)}
                                      className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500"
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Confirm Delivery
                                    </Button>
                                  )}

                                  {purchase.status === "buyer_confirmed" && (
                                    <div className="flex items-center gap-2 text-sm text-blue-600">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Waiting for seller approval...
                                    </div>
                                  )}

                                  {purchase.status === "completed" && purchase.nftTransferTxHash && (
                                    <a
                                      href={`https://sepolia.etherscan.io/tx/${purchase.nftTransferTxHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      View NFT Transfer
                                    </a>
                                  )}

                                  {purchase.txHash && (
                                    <a
                                      href={`https://sepolia.etherscan.io/tx/${purchase.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      View Purchase Tx
                                    </a>
                                  )}
                                </div>

                                {/* Feedback Summary */}
                                {purchase.buyerRating && (
                                  <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-200">
                                    <div className="flex items-center gap-2">
                                      {purchase.buyerRating === "good" ? (
                                        <ThumbsUp className="h-4 w-4 text-emerald-500" />
                                      ) : (
                                        <ThumbsDown className="h-4 w-4 text-red-500" />
                                      )}
                                      <span className="text-sm font-medium text-slate-700">
                                        Your Feedback: {purchase.buyerRating === "good" ? "Product is Good" : "Product has Issues"}
                                      </span>
                                    </div>
                                    {purchase.buyerFeedback && (
                                      <p className="mt-2 text-sm text-slate-600">{purchase.buyerFeedback}</p>
                                    )}
                                    {purchase.sellerResponse && (
                                      <div className="mt-2 pt-2 border-t border-slate-200">
                                        <span className="text-xs font-semibold text-slate-500">Seller Response:</span>
                                        <p className="mt-1 text-sm text-slate-600">{purchase.sellerResponse}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Blockchain Purchases - Real data from smart contract */}
                  <Card className="relative overflow-hidden border border-blue-200 bg-gradient-to-br from-white via-blue-50/50 to-blue-100/30 shadow-xl mt-6">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500" />
                    
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          📦 My NFT Purchases (Blockchain)
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                          Purchases synced directly from the smart contract
                        </CardDescription>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={fetchBlockchainPurchases}
                        disabled={loadingBlockchainPurchases}
                      >
                        {loadingBlockchainPurchases ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "↻ Refresh"
                        )}
                      </Button>
                    </CardHeader>

                    {loadingBlockchainPurchases ? (
                      <div className="flex items-center justify-center py-12 px-6">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-3 text-slate-600">Loading from blockchain...</span>
                      </div>
                    ) : blockchainPurchases.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        <div className="rounded-full bg-blue-100 p-5 border border-blue-200">
                          <Package className="h-10 w-10 text-blue-400" />
                        </div>
                        <p className="mt-4 text-base font-semibold text-slate-800">No blockchain purchases yet</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {wallet ? "Your purchases will appear here after buying from the marketplace" : "Connect your wallet to see your blockchain purchases"}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 px-6 pb-6">
                        {blockchainPurchases.map((purchase, idx) => (
                          <motion.div
                            key={`${purchase.nftContract}-${purchase.tokenId}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="group overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md hover:shadow-lg transition-all duration-300"
                          >
                            <div className="flex flex-col lg:flex-row">
                              {/* Product Image */}
                              <div className="relative w-full lg:w-48 aspect-video lg:aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                                {purchase.metadata?.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={purchase.metadata.image.startsWith("ipfs://") 
                                      ? purchase.metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
                                      : purchase.metadata.image
                                    }
                                    alt={purchase.metadata?.name || "NFT"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="h-12 w-12 text-slate-300" />
                                  </div>
                                )}

                                {/* Status Badge */}
                                <Badge className={cn(
                                  "absolute left-2 top-2",
                                  purchase.status === PurchaseStatus.ESCROW && "bg-yellow-500",
                                  purchase.status === PurchaseStatus.DELIVERED && "bg-blue-500",
                                  purchase.status === PurchaseStatus.COMPLETED && "bg-emerald-500",
                                )}>
                                  {purchase.status === PurchaseStatus.ESCROW && "💰 In Escrow"}
                                  {purchase.status === PurchaseStatus.DELIVERED && "📦 Shipped"}
                                  {purchase.status === PurchaseStatus.COMPLETED && "✓ Completed"}
                                </Badge>
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 p-5">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                      {purchase.metadata?.name || `Token #${purchase.tokenId}`}
                                    </h3>
                                    {purchase.metadata?.description && (
                                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                        {purchase.metadata.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-[#0D7B7A] text-lg">{purchase.priceEth} ETH</div>
                                    <div className="text-xs text-slate-400">
                                      ≈ ₹{formatInr(Math.round(parseFloat(purchase.priceEth) * (inrPerEth || 0)))}
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-slate-400">Token ID</span>
                                    <div className="font-mono font-semibold text-slate-700">#{purchase.tokenId}</div>
                                  </div>
                                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                    <span className="text-slate-400">Seller</span>
                                    <div className="font-mono font-semibold text-slate-700">
                                      {shortenAddress(purchase.seller)}
                                    </div>
                                  </div>
                                </div>

                                {/* Status Explanation */}
                                {purchase.status === PurchaseStatus.ESCROW && (
                                  <div className="mt-4 p-3 rounded-xl bg-yellow-50 border border-yellow-200">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-700">
                                      <Clock className="h-4 w-4" />
                                      Waiting for Seller to Ship
                                    </div>
                                    <p className="mt-1 text-xs text-yellow-600">
                                      Your payment is held in escrow. The seller will confirm shipping soon.
                                    </p>
                                  </div>
                                )}

                                {purchase.status === PurchaseStatus.DELIVERED && (
                                  <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                                      <Package className="h-4 w-4" />
                                      Seller Has Shipped Your Order!
                                    </div>
                                    <p className="mt-1 text-xs text-blue-600">
                                      Confirm delivery below once you receive the product. This will transfer the NFT to your wallet and release payment to the seller.
                                    </p>
                                  </div>
                                )}

                                {purchase.status === PurchaseStatus.COMPLETED && (
                                  <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                                      <CheckCircle className="h-4 w-4" />
                                      Transaction Complete!
                                    </div>
                                    <p className="mt-1 text-xs text-emerald-600">
                                      The NFT has been transferred to your wallet and payment released to the seller.
                                    </p>
                                  </div>
                                )}

                                {/* Action Button */}
                                {purchase.status === PurchaseStatus.DELIVERED && (
                                  <Button
                                    className="mt-4 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500"
                                    onClick={() => {
                                      setSelectedBlockchainPurchase(purchase);
                                      setConfirmStep("upload");
                                    }}
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Confirm Delivery & Receive NFT
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Checkout Modal */}
            <AnimatePresence>
              {checkoutListing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && checkoutStep !== "success") resetCheckoutModal();
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
                  >
                    {/* Close Button */}
                    {checkoutStep !== "success" && (
                      <button
                        onClick={resetCheckoutModal}
                        className="absolute right-4 top-4 z-10 rounded-full bg-slate-100 p-2 transition hover:bg-slate-200"
                      >
                        <X className="h-5 w-5 text-slate-600" />
                      </button>
                    )}

                    {/* Header */}
                    <div className="border-b border-slate-200 px-6 py-4">
                      <h2 className="text-xl font-bold text-slate-900">
                        {checkoutStep === "address" && "Delivery Information"}
                        {checkoutStep === "payment" && "Confirm Payment"}
                        {checkoutStep === "success" && "Purchase Successful!"}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {checkoutStep === "address" && "Enter your delivery address to continue"}
                        {checkoutStep === "payment" && "Review and confirm your purchase"}
                        {checkoutStep === "success" && "Your order has been placed successfully"}
                      </p>
                    </div>

                    <div className="p-6">
                      {/* Product Summary */}
                      {checkoutStep !== "success" && (
                        <div className="mb-6 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[#0D7B7A]/20 to-[#D4A574]/20 flex items-center justify-center">
                            {(() => {
                              const product = getProductForListing(checkoutListing);
                              return product.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={product.image} alt={product.name} className="h-full w-full rounded-xl object-cover" />
                              ) : (
                                <span className="text-2xl">🎨</span>
                              );
                            })()}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">
                              {getProductForListing(checkoutListing).name}
                            </h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-lg font-bold text-[#0D7B7A]">
                                {Number(ethersUtils.formatEther(checkoutListing.priceWei)).toFixed(4)} ETH
                              </span>
                              <span className="text-sm text-slate-500">
                                {inrPerEth ? formatInr(Number(ethersUtils.formatEther(checkoutListing.priceWei)) * inrPerEth) : ""}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step: Address Form */}
                      {checkoutStep === "address" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={deliveryAddress.fullName}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, fullName: e.target.value }))}
                              placeholder="Enter your full name"
                              className={cn(
                                "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20",
                                addressErrors.fullName ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#0D7B7A]"
                              )}
                            />
                            {addressErrors.fullName && (
                              <p className="mt-1 text-xs text-red-500">{addressErrors.fullName}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={deliveryAddress.phone}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, phone: e.target.value }))}
                              placeholder="10-digit mobile number"
                              className={cn(
                                "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20",
                                addressErrors.phone ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#0D7B7A]"
                              )}
                            />
                            {addressErrors.phone && (
                              <p className="mt-1 text-xs text-red-500">{addressErrors.phone}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Address Line 1 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={deliveryAddress.addressLine1}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, addressLine1: e.target.value }))}
                              placeholder="House/Flat No., Building Name, Street"
                              className={cn(
                                "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20",
                                addressErrors.addressLine1 ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#0D7B7A]"
                              )}
                            />
                            {addressErrors.addressLine1 && (
                              <p className="mt-1 text-xs text-red-500">{addressErrors.addressLine1}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Address Line 2 (Optional)
                            </label>
                            <input
                              type="text"
                              value={deliveryAddress.addressLine2}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, addressLine2: e.target.value }))}
                              placeholder="Landmark, Area"
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#0D7B7A] focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                City <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={deliveryAddress.city}
                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="City"
                                className={cn(
                                  "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20",
                                  addressErrors.city ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#0D7B7A]"
                                )}
                              />
                              {addressErrors.city && (
                                <p className="mt-1 text-xs text-red-500">{addressErrors.city}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                State <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={deliveryAddress.state}
                                onChange={(e) => setDeliveryAddress(prev => ({ ...prev, state: e.target.value }))}
                                placeholder="State"
                                className={cn(
                                  "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20",
                                  addressErrors.state ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#0D7B7A]"
                                )}
                              />
                              {addressErrors.state && (
                                <p className="mt-1 text-xs text-red-500">{addressErrors.state}</p>
                              )}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Pincode <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={deliveryAddress.pincode}
                              onChange={(e) => setDeliveryAddress(prev => ({ ...prev, pincode: e.target.value }))}
                              placeholder="6-digit pincode"
                              maxLength={6}
                              className={cn(
                                "w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20",
                                addressErrors.pincode ? "border-red-300 focus:border-red-500" : "border-slate-200 focus:border-[#0D7B7A]"
                              )}
                            />
                            {addressErrors.pincode && (
                              <p className="mt-1 text-xs text-red-500">{addressErrors.pincode}</p>
                            )}
                          </div>

                          <Button
                            className="w-full py-3 mt-4 bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6]"
                            onClick={handleProceedToPayment}
                          >
                            Proceed to Payment
                          </Button>
                        </div>
                      )}

                      {/* Step: Payment Confirmation */}
                      {checkoutStep === "payment" && (
                        <div className="space-y-4">
                          {/* Delivery Address Summary */}
                          <div className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-[#0D7B7A]" />
                                Delivery Address
                              </h4>
                              <button
                                onClick={() => setCheckoutStep("address")}
                                className="text-sm text-[#0D7B7A] hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                            <div className="text-sm text-slate-600">
                              <p className="font-medium text-slate-900">{deliveryAddress.fullName}</p>
                              <p>{deliveryAddress.addressLine1}</p>
                              {deliveryAddress.addressLine2 && <p>{deliveryAddress.addressLine2}</p>}
                              <p>{deliveryAddress.city}, {deliveryAddress.state} - {deliveryAddress.pincode}</p>
                              <p className="mt-1">📞 {deliveryAddress.phone}</p>
                            </div>
                          </div>

                          {/* Wallet Connection Warning */}
                          {!wallet && (
                            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                              <div className="flex items-center gap-2 text-sm text-amber-700">
                                <AlertCircle className="h-4 w-4" />
                                <span>Please connect your wallet to proceed</span>
                              </div>
                              <Button
                                size="sm"
                                onClick={connectWallet}
                                className="bg-amber-500 hover:bg-amber-600"
                              >
                                Connect Wallet
                              </Button>
                            </div>
                          )}

                          {/* Payment Info */}
                          <div className="rounded-xl border border-[#0D7B7A]/20 bg-[#0D7B7A]/5 p-4">
                            <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3">
                              <Shield className="h-4 w-4 text-[#0D7B7A]" />
                              Secure Escrow Payment
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-600">Item Price</span>
                                <span className="font-medium">{Number(ethersUtils.formatEther(checkoutListing.priceWei)).toFixed(4)} ETH</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-600">Platform Fee</span>
                                <span className="font-medium">Included</span>
                              </div>
                              <div className="border-t border-slate-200 pt-2 flex justify-between">
                                <span className="font-semibold text-slate-900">Total</span>
                                <span className="font-bold text-[#0D7B7A]">{Number(ethersUtils.formatEther(checkoutListing.priceWei)).toFixed(4)} ETH</span>
                              </div>
                            </div>
                          </div>

                          {/* Info Box */}
                          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                            <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-700">
                              <p className="font-semibold">How Escrow Works</p>
                              <p className="mt-1">Your payment will be held securely in escrow until you confirm receipt of the product. The seller will ship the item to your address.</p>
                            </div>
                          </div>

                          {marketError && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                              <AlertCircle className="h-4 w-4" />
                              {marketError}
                            </div>
                          )}

                          <div className="flex gap-3">
                            <Button
                              variant="ghost"
                              className="flex-1 py-3"
                              onClick={() => setCheckoutStep("address")}
                              disabled={isProcessingPayment}
                            >
                              Back
                            </Button>
                            <Button
                              className="flex-1 py-3 bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6]"
                              onClick={handleConfirmPayment}
                              disabled={isProcessingPayment || !wallet}
                            >
                              {isProcessingPayment ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : !wallet ? (
                                <>
                                  <AlertCircle className="mr-2 h-4 w-4" />
                                  Connect Wallet First
                                </>
                              ) : (
                                <>
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Confirm & Pay
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Step: Success */}
                      {checkoutStep === "success" && (
                        <div className="text-center py-6">
                          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">
                            Purchase Successful!
                          </h3>
                          <p className="text-slate-600 mb-4">
                            Your payment is now held in escrow. The seller will ship the product to your address.
                          </p>
                          
                          {paymentTxHash && (
                            <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200">
                              <p className="text-xs text-slate-500 mb-1">Transaction Hash</p>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${paymentTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[#0D7B7A] hover:underline flex items-center justify-center gap-1"
                              >
                                {paymentTxHash.slice(0, 10)}...{paymentTxHash.slice(-8)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}

                          <div className="space-y-3">
                            <Button
                              className="w-full py-3 bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6]"
                              onClick={() => {
                                resetCheckoutModal();
                                setActiveTab("profile");
                              }}
                            >
                              View My Purchases
                            </Button>
                            <Button
                              variant="ghost"
                              className="w-full py-3"
                              onClick={resetCheckoutModal}
                            >
                              Continue Shopping
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

{/* Feedback Modal - Confirm Delivery */}
            <AnimatePresence>
              {(feedbackPurchase || selectedBlockchainPurchase) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                  onClick={(e) => {
                    if (e.target === e.currentTarget && !isSubmittingFeedback) resetFeedbackModal();
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
                  >
                    {/* Modal Header */}
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">Confirm Delivery</h2>
                        <p className="text-sm text-slate-500">
                          {confirmStep === "upload" && "Step 1: Upload product photos"}
                          {confirmStep === "terms" && "Step 2: Accept terms and conditions"}
                          {confirmStep === "confirm" && "Delivery confirmed!"}
                        </p>
                      </div>
                      {!isSubmittingFeedback && confirmStep !== "confirm" && (
                        <button
                          onClick={resetFeedbackModal}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Product Info */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        {/* Show image from localStorage purchase OR blockchain purchase */}
                        {(feedbackPurchase?.productImage || selectedBlockchainPurchase?.metadata?.image) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={
                              feedbackPurchase?.productImage || 
                              (selectedBlockchainPurchase?.metadata?.image?.startsWith("ipfs://")
                                ? selectedBlockchainPurchase.metadata.image.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/")
                                : selectedBlockchainPurchase?.metadata?.image || "")
                            }
                            alt={feedbackPurchase?.productName || selectedBlockchainPurchase?.metadata?.name || "NFT"}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {feedbackPurchase?.productName || selectedBlockchainPurchase?.metadata?.name || `Token #${selectedBlockchainPurchase?.tokenId}`}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {feedbackPurchase 
                              ? `₹${feedbackPurchase.priceInr.toLocaleString()}`
                              : `${selectedBlockchainPurchase?.priceEth} ETH`
                            }
                          </p>
                        </div>
                      </div>

                      {/* Step 1: Upload Photos */}
                      {confirmStep === "upload" && (
                        <>
                          {/* Photo Upload */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Upload Product Photos *
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                              Upload photos of the received product to confirm delivery
                            </p>
                            
                            <div className="grid grid-cols-3 gap-3">
                              {feedbackPhotos.map((url, index) => (
                                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" />
                                  <button
                                    onClick={() => removeFeedbackPhoto(index)}
                                    className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                              
                              {feedbackPhotos.length < 5 && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-[#0D7B7A] hover:bg-[#0D7B7A]/5 transition-colors">
                                  <Camera className="h-6 w-6 text-slate-400" />
                                  <span className="mt-1 text-xs text-slate-500">Add Photo</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFeedbackPhotoUpload}
                                  />
                                </label>
                              )}
                            </div>
                          </div>

                          {/* Feedback Text */}
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Additional Comments (Optional)
                            </label>
                            <textarea
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              placeholder="Share your experience with the product..."
                              rows={3}
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#0D7B7A] focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20"
                            />
                          </div>

                          {/* Next Button */}
                          <Button
                            className="w-full py-3 bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6]"
                            disabled={feedbackPhotos.length === 0}
                            onClick={() => setConfirmStep("terms")}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Continue to Terms
                          </Button>
                        </>
                      )}

                      {/* Step 2: Terms & Conditions */}
                      {confirmStep === "terms" && (
                        <>
                          {/* Terms Box */}
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-60 overflow-y-auto">
                            <h3 className="font-bold text-slate-800 mb-3">Terms & Conditions</h3>
                            <div className="text-sm text-slate-600 space-y-3">
                              <p><strong>1. Delivery Confirmation:</strong> By confirming delivery, you acknowledge that you have received the physical product in satisfactory condition.</p>
                              <p><strong>2. NFT Transfer:</strong> Upon confirmation, the NFT representing ownership of this product will be transferred to your wallet address.</p>
                              <p><strong>3. Payment Release:</strong> The payment held in escrow will be released to the seller minus platform fees (2.5%).</p>
                              <p><strong>4. Final Sale:</strong> This transaction is final. Once confirmed, the sale cannot be reversed or refunded.</p>
                              <p><strong>5. Authenticity Guarantee:</strong> The NFT certifies the authenticity of the artisan product. Any disputes about authenticity must be raised before confirmation.</p>
                              <p><strong>6. No Warranty:</strong> Artisol is a marketplace platform and does not provide warranties on products sold.</p>
                            </div>
                          </div>

                          {/* Accept Checkbox */}
                          <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:border-[#0D7B7A]/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={termsAccepted}
                              onChange={(e) => setTermsAccepted(e.target.checked)}
                              className="mt-1 h-5 w-5 rounded border-slate-300 text-[#0D7B7A] focus:ring-[#0D7B7A]"
                            />
                            <span className="text-sm text-slate-700">
                              I have received the product in satisfactory condition and agree to the Terms & Conditions. I understand that confirming delivery will transfer the NFT to my wallet and release payment to the seller.
                            </span>
                          </label>

                          {/* Info Box */}
                          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-700">
                              <p className="font-semibold">Important!</p>
                              <p className="mt-1">Once you confirm delivery, the payment will be released to the seller and you will receive the NFT. This action cannot be undone.</p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <Button
                              variant="ghost"
                              className="flex-1"
                              onClick={() => setConfirmStep("upload")}
                            >
                              <ArrowLeft className="mr-2 h-4 w-4" />
                              Back
                            </Button>
                            <Button
                              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-400"
                              disabled={!termsAccepted || isSubmittingFeedback}
                              onClick={selectedBlockchainPurchase ? handleBlockchainConfirmDelivery : handleSubmitFeedback}
                            >
                              {isSubmittingFeedback ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Confirm Delivery
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      )}

                      {/* Step 3: Success */}
                      {confirmStep === "confirm" && (
                        <div className="py-6">
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-4">
                              <CheckCircle className="h-10 w-10 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800">Delivery Confirmed!</h3>
                            <p className="mt-2 text-slate-600">
                              Transaction completed successfully
                            </p>
                          </div>

                          {/* Transaction Details */}
                          {transactionDetails && (
                            <div className="space-y-4">
                              {/* NFT Transfer */}
                              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                                <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                                  <Award className="h-5 w-5" />
                                  NFT Transferred to Your Wallet
                                </div>
                                <p className="text-sm text-blue-600">
                                  Token #{selectedBlockchainPurchase?.tokenId} is now in your wallet
                                </p>
                              </div>

                              {/* Fund Transfer Details */}
                              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
                                  <Send className="h-5 w-5" />
                                  Funds Released to Seller
                                </div>
                                
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between py-1 border-b border-emerald-200">
                                    <span className="text-slate-600">Escrow Amount</span>
                                    <span className="font-mono font-semibold text-slate-800">{transactionDetails.amountReleased} ETH</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-emerald-200">
                                    <span className="text-slate-600">Platform Fee (2.5%)</span>
                                    <span className="font-mono text-red-600">-{transactionDetails.platformFee} ETH</span>
                                  </div>
                                  <div className="flex justify-between py-1 border-b border-emerald-200">
                                    <span className="font-semibold text-slate-700">Net to Seller</span>
                                    <span className="font-mono font-bold text-emerald-600">+{transactionDetails.netToSeller} ETH</span>
                                  </div>
                                </div>
                              </div>

                              {/* Seller Wallet Balance */}
                              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <div className="text-sm font-semibold text-slate-700 mb-2">
                                  Seller Wallet: {transactionDetails.sellerAddress.slice(0, 6)}...{transactionDetails.sellerAddress.slice(-4)}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 rounded-lg bg-white border border-slate-100">
                                    <div className="text-xs text-slate-400">Before</div>
                                    <div className="font-mono text-sm font-semibold text-slate-600">
                                      {parseFloat(transactionDetails.sellerBalanceBefore).toFixed(6)} ETH
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-emerald-100 border border-emerald-200">
                                    <div className="text-xs text-emerald-600">After</div>
                                    <div className="font-mono text-sm font-semibold text-emerald-700">
                                      {parseFloat(transactionDetails.sellerBalanceAfter).toFixed(6)} ETH
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-2 text-center">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                                    ↑ +{(parseFloat(transactionDetails.sellerBalanceAfter) - parseFloat(transactionDetails.sellerBalanceBefore)).toFixed(6)} ETH
                                  </span>
                                </div>
                              </div>

                              {/* Transaction Link */}
                              <a
                                href={`https://sepolia.etherscan.io/tx/${transactionDetails.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-sm font-semibold text-slate-700"
                              >
                                <ExternalLink className="h-4 w-4" />
                                View Transaction on Etherscan
                              </a>
                            </div>
                          )}

                          {/* Close Button */}
                          <Button
                            className="w-full mt-6 bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6]"
                            onClick={resetFeedbackModal}
                          >
                            Done
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
