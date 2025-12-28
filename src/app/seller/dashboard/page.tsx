"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AuthGuard } from "@/components/AuthGuard";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/session";
import { getBrowserProvider, getRpcProvider } from "@/lib/web3";
import { getMarketplaceWriteContract, getMarketplaceAddress, PurchaseStatus } from "@/lib/contracts/marketplace";
import { getMarketplaceReadContract } from "@/lib/contracts/marketplace";
import {
  getArtisolNFTWriteContract,
  getArtisolNFTReadContract,
  getArtisolNFTAddress,
  generateProductHash,
  generateTokenURI,
} from "@/lib/contracts/artisolNFT";
import { uploadToIPFS, isPinataConfigured } from "@/lib/ipfs";
import { formatInr, useEthInrRate } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import {
  Plus,
  Upload,
  FileVideo,
  Image as ImageIcon,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Shield,
  Copy,
  Eye,
  Package,
  IndianRupee,
  CheckCircle2,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Send,
  User,
  MessageSquare,
} from "lucide-react";
import {
  Purchase,
  getSellerPurchases,
  getSellerPendingApprovals,
  getSellerNewOrders,
  generateDemoSellerPurchases,
  sellerApprove,
  sellerConfirmOrder,
} from "@/lib/purchaseStore";

type ProductListing = {
  id: string;
  title: string;
  category: string;
  description: string;
  priceInr: number;
  proofImages: string[];
  proofVideos: string[];
  nftToken: string; // Token ID on blockchain
  txHash: string; // Transaction hash for verification
  nftContractAddress: string; // Contract address
  status: "listed" | "sold";
  createdAt: Date;
};

type ListingRow = {
  nftContract: string;
  tokenId: bigint;
  seller: string;
  priceWei: bigint;
  sold: boolean;
};

// Blockchain order type
type BlockchainOrder = {
  nftContract: string;
  tokenId: string;
  seller: string;
  priceWei: string;
  priceEth: number;
  buyer: string;
  status: PurchaseStatus;
  purchaseTime: number;
  metadata?: {
    name: string;
    description: string;
    image: string;
  };
};

function StatCard({ label, value, sub, icon, gradient }: { label: string; value: string; sub?: string; icon?: React.ReactNode; gradient?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-0 shadow-xl",
        "hover:shadow-2xl transition-all duration-300"
      )} style={{ background: gradient || "linear-gradient(135deg, #0D7B7A 0%, #D4A574 100%)" }}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <div className="relative flex items-start justify-between p-6">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/80">{label}</div>
            <div className="mt-3 text-4xl font-extrabold text-white drop-shadow-md">{value}</div>
            {sub ? <div className="mt-2 text-sm font-medium text-white/70">{sub}</div> : null}
          </div>
          {icon && (
            <div className="rounded-2xl bg-white/25 p-3.5 text-white backdrop-blur-sm shadow-inner border border-white/20">
              {icon}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </Card>
    </motion.div>
  );
}

const categories = [
  "Textile & Fabric",
  "Painting & Art",
  "Wood Craft",
  "Metalwork",
  "Pottery & Ceramics",
  "Jewelry",
  "Leather Goods",
  "Stone Carving",
  "Other",
];

export default function SellerDashboardPage() {
  const session = getSession();
  const { inrPerEth } = useEthInrRate();

  const [wallet, setWallet] = React.useState<string | null>(null);
  const [walletError, setWalletError] = React.useState<string | null>(null);

  const [listings, setListings] = React.useState<ListingRow[]>([]);
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [statsError, setStatsError] = React.useState<string | null>(null);

  // My posted products
  const [myProducts, setMyProducts] = React.useState<ProductListing[]>([]);

  // Pending Approvals state
  const [pendingApprovals, setPendingApprovals] = React.useState<Purchase[]>([]);
  const [newOrders, setNewOrders] = React.useState<Purchase[]>([]);
  const [allSoldItems, setAllSoldItems] = React.useState<Purchase[]>([]);
  const [approvalResponse, setApprovalResponse] = React.useState("");
  const [isApproving, setIsApproving] = React.useState<string | null>(null);
  const [isShipping, setIsShipping] = React.useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = React.useState<Purchase | null>(null);
  const [selectedNewOrder, setSelectedNewOrder] = React.useState<Purchase | null>(null);
  
  // Blockchain orders (fetched from contract)
  const [blockchainOrders, setBlockchainOrders] = React.useState<BlockchainOrder[]>([]);
  const [loadingBlockchainOrders, setLoadingBlockchainOrders] = React.useState(false);

  // Fetch orders from blockchain for this seller
  const fetchBlockchainOrders = React.useCallback(async () => {
    if (!wallet) return;
    
    setLoadingBlockchainOrders(true);
    try {
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/hgBu-UD8N-2ZoBs_Ts17o";
      const marketplaceAddr = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || "0x278a4E4E067406c2EA1588E19F58957BD543715a";
      const nftContractAddr = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || "0x4BF3114037896dEaEAEE3299306C57f2f95aB664";
      
      const { providers: ethersProviders, Contract, utils: ethersUtils } = await import("ethers");
      const provider = new ethersProviders.JsonRpcProvider(rpcUrl);
      
      const marketplaceAbi = [
        "function listingCount() view returns (uint256)",
        "function getListingByIndex(uint256 index) view returns (address nftContract, uint256 tokenId, address seller, uint256 priceWei, bool sold)",
        "function getPurchase(address nftContract, uint256 tokenId) view returns (address buyer, uint256 amountPaid, uint8 status, uint256 purchaseTime, uint256 deliveryTime, uint256 completionTime)"
      ];
      
      const nftAbi = [
        "function tokenURI(uint256 tokenId) view returns (string)"
      ];
      
      const marketplaceContract = new Contract(marketplaceAddr, marketplaceAbi, provider);
      const nftContract = new Contract(nftContractAddr, nftAbi, provider);
      
      const count = await marketplaceContract.listingCount();
      const orders: BlockchainOrder[] = [];
      
      for (let i = 0; i < Number(count); i++) {
        const listing = await marketplaceContract.getListingByIndex(i);
        const sellerAddr = listing.seller.toLowerCase();
        
        // Only show orders for this seller
        if (sellerAddr !== wallet.toLowerCase()) continue;
        
        // Get purchase info
        const purchase = await marketplaceContract.getPurchase(listing.nftContract, listing.tokenId);
        
        // Only show if there's a buyer (status > 0 means purchased)
        if (Number(purchase.status) === 0) continue;
        
        // Fetch NFT metadata
        let metadata: BlockchainOrder["metadata"];
        try {
          const tokenURI = await nftContract.tokenURI(listing.tokenId);
          if (tokenURI.startsWith("data:application/json;base64,")) {
            const base64 = tokenURI.replace("data:application/json;base64,", "");
            const jsonString = atob(base64);
            metadata = JSON.parse(jsonString);
          }
        } catch (e) {
          console.error("Failed to fetch metadata for token", listing.tokenId.toString());
        }
        
        orders.push({
          nftContract: listing.nftContract,
          tokenId: listing.tokenId.toString(),
          seller: listing.seller,
          priceWei: listing.priceWei.toString(),
          priceEth: Number(ethersUtils.formatEther(listing.priceWei)),
          buyer: purchase.buyer,
          status: Number(purchase.status) as PurchaseStatus,
          purchaseTime: Number(purchase.purchaseTime),
          metadata,
        });
      }
      
      setBlockchainOrders(orders);
      console.log("Found", orders.length, "blockchain orders for seller");
    } catch (e) {
      console.error("Failed to fetch blockchain orders:", e);
    } finally {
      setLoadingBlockchainOrders(false);
    }
  }, [wallet]);

  // Load blockchain orders when wallet connects
  React.useEffect(() => {
    if (wallet) {
      fetchBlockchainOrders();
    }
  }, [wallet, fetchBlockchainOrders]);

  // Load seller purchases
  React.useEffect(() => {
    if (session?.email) {
      generateDemoSellerPurchases(session.email);
      setPendingApprovals(getSellerPendingApprovals(session.email));
      setNewOrders(getSellerNewOrders(session.email));
      setAllSoldItems(getSellerPurchases(session.email));
    }
  }, [session?.email]);

  // Refresh purchases
  const refreshSellerPurchases = () => {
    if (session?.email) {
      setPendingApprovals(getSellerPendingApprovals(session.email));
      setNewOrders(getSellerNewOrders(session.email));
      setAllSoldItems(getSellerPurchases(session.email));
    }
  };

  // Handle seller confirming/shipping order
  const handleShipOrder = async (purchase: Purchase) => {
    if (!wallet) {
      setMintError("Please connect your wallet first");
      return;
    }
    
    setIsShipping(purchase.id);
    
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
        setIsShipping(null);
        setMintError("Network switched to Sepolia. Please try again.");
        return;
      }
      
      const signer = await provider.getSigner();
      const contract = getMarketplaceWriteContract(signer);
      
      // Call markDelivered on the blockchain
      const tx = await contract.markDelivered(purchase.nftContract, BigInt(purchase.tokenId));
      await tx.wait();
      
      // Update local store
      sellerConfirmOrder(purchase.id, tx.hash);
      refreshSellerPurchases();
      setSelectedNewOrder(null);
    } catch (e) {
      console.error("Failed to mark as shipped:", e);
      setMintError(e instanceof Error ? e.message : "Failed to confirm order");
    } finally {
      setIsShipping(null);
    }
  };

  // Handle blockchain order confirmation (for orders from blockchain)
  const handleBlockchainShipOrder = async (order: BlockchainOrder) => {
    if (!wallet) {
      setMintError("Please connect your wallet first");
      return;
    }
    
    setIsShipping(order.tokenId);
    
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
        setIsShipping(null);
        setMintError("Network switched to Sepolia. Please try again.");
        return;
      }
      
      const signer = await provider.getSigner();
      const contract = getMarketplaceWriteContract(signer);
      
      // Call markDelivered on the blockchain
      const tx = await contract.markDelivered(order.nftContract, BigInt(order.tokenId));
      await tx.wait();
      
      // Refresh blockchain orders
      await fetchBlockchainOrders();
      setMintError(null);
    } catch (e) {
      console.error("Failed to mark as shipped:", e);
      setMintError(e instanceof Error ? e.message : "Failed to confirm order");
    } finally {
      setIsShipping(null);
    }
  };

  // Handle seller approval
  const handleApprove = (purchase: Purchase) => {
    setIsApproving(purchase.id);
    
    // Simulate network delay for NFT transfer
    setTimeout(() => {
      const mockTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
      sellerApprove(purchase.id, approvalResponse || "Thank you for your purchase!", mockTxHash);
      refreshSellerPurchases();
      setIsApproving(null);
      setSelectedApproval(null);
      setApprovalResponse("");
    }, 2000);
  };

  // Create Listing Form State
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [formStep, setFormStep] = React.useState<"details" | "proofs" | "preview" | "success">("details");
  
  // Form fields
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priceInr, setPriceInr] = React.useState("");
  const [proofImages, setProofImages] = React.useState<File[]>([]);
  const [proofVideos, setProofVideos] = React.useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = React.useState<string[]>([]);
  const [videoPreviewUrls, setVideoPreviewUrls] = React.useState<string[]>([]);

  // Posting state
  const [isPosting, setIsPosting] = React.useState(false);
  const [generatedToken, setGeneratedToken] = React.useState<string | null>(null);
  const [txHash, setTxHash] = React.useState<string | null>(null);
  const [mintError, setMintError] = React.useState<string | null>(null);
  const [nftContractAddr, setNftContractAddr] = React.useState<string | null>(null);

  async function connectWallet() {
    setWalletError(null);
    try {
      const provider = getBrowserProvider();
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWallet(address);
    } catch (e) {
      setWallet(null);
      setWalletError(e instanceof Error ? e.message : "Failed to connect wallet");
    }
  }

  async function loadStats() {
    setStatsError(null);
    setLoadingStats(true);
    try {
      const provider = (() => {
        try {
          return getRpcProvider();
        } catch {
          return getBrowserProvider();
        }
      })();

      const contract = getMarketplaceReadContract(provider);
      const count = await contract.listingCount();
      const n = Number(count);

      const rows: ListingRow[] = [];
      for (let i = 0; i < n; i++) {
        const row = await contract.getListingByIndex(i);
        rows.push({
          nftContract: row[0] as string,
          tokenId: row[1] as bigint,
          seller: row[2] as string,
          priceWei: row[3] as bigint,
          sold: row[4] as boolean,
        });
      }

      setListings(rows);
    } catch (e) {
      setListings([]);
      setStatsError(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoadingStats(false);
    }
  }

  React.useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setProofImages((prev) => [...prev, ...files]);
    const urls = files.map((file) => URL.createObjectURL(file));
    setImagePreviewUrls((prev) => [...prev, ...urls]);
  };

  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setProofVideos((prev) => [...prev, ...files]);
    const urls = files.map((file) => URL.createObjectURL(file));
    setVideoPreviewUrls((prev) => [...prev, ...urls]);
  };

  // Remove image
  const removeImage = (index: number) => {
    setProofImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove video
  const removeVideo = (index: number) => {
    setProofVideos((prev) => prev.filter((_, i) => i !== index));
    setVideoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset form
  const resetForm = () => {
    setTitle("");
    setCategory("");
    setDescription("");
    setPriceInr("");
    setProofImages([]);
    setProofVideos([]);
    setImagePreviewUrls([]);
    setVideoPreviewUrls([]);
    setFormStep("details");
    setGeneratedToken(null);
    setTxHash(null);
    setMintError(null);
    setNftContractAddr(null);
    setShowCreateForm(false);
  };

  // Post listing - Mint real NFT on blockchain
  const handlePost = async () => {
    if (!wallet) {
      setMintError("Please connect your wallet first");
      return;
    }

    setIsPosting(true);
    setMintError(null);
    setTxHash(null);

    try {
      // Upload images to IPFS first
      let permanentImageUrls: string[] = [];
      
      if (isPinataConfigured() && proofImages.length > 0) {
        console.log("Uploading images to IPFS...");
        for (const file of proofImages) {
          const result = await uploadToIPFS(file);
          if (result.success && result.ipfsUrl) {
            permanentImageUrls.push(result.ipfsUrl);
            console.log("Uploaded to IPFS:", result.ipfsUrl);
          } else {
            console.warn("IPFS upload failed for file:", file.name, result.error);
            // Fall back to blob URL if IPFS fails
            const blobUrl = imagePreviewUrls[proofImages.indexOf(file)];
            if (blobUrl) permanentImageUrls.push(blobUrl);
          }
        }
      } else {
        // Use blob URLs as fallback (not ideal but works for testing)
        console.log("Pinata not configured, using local URLs (images won't be permanent)");
        permanentImageUrls = [...imagePreviewUrls];
      }

      // Get browser provider and signer
      const provider = getBrowserProvider();
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
        setMintError("Network switched to Sepolia. Please try again.");
        setIsPosting(false);
        return;
      }
      
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Get NFT contract
      const nftContract = getArtisolNFTWriteContract(signer);
      const contractAddress = getArtisolNFTAddress();
      setNftContractAddr(contractAddress);

      // Generate product hash for on-chain verification
      const productHash = generateProductHash({
        title,
        category,
        description,
        priceInr: Number(priceInr),
        artisan: signerAddress,
      });

      // Generate token URI with metadata (using IPFS URLs)
      const tokenURI = generateTokenURI({
        title,
        category,
        description,
        priceInr: Number(priceInr),
        images: permanentImageUrls,
        artisan: signerAddress,
      });

      // Mint the NFT on blockchain
      console.log("Minting NFT...");
      const tx = await nftContract.mintNFT(signerAddress, tokenURI, productHash);
      console.log("Transaction submitted:", tx.hash);
      setTxHash(tx.hash);

      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Get the token ID from the event logs
      let tokenId = "0";
      if (receipt && receipt.logs) {
        // Find the NFTMinted event or Transfer event
        for (const log of receipt.logs) {
          try {
            // The third topic in Transfer event is the tokenId
            if (log.topics && log.topics.length >= 4) {
              tokenId = BigInt(log.topics[3]).toString();
              break;
            }
          } catch (e) {
            // Continue to next log
          }
        }
      }

      setGeneratedToken(tokenId);

      // Check if marketplace is already approved for all tokens (one-time approval)
      const marketplaceAddress = getMarketplaceAddress();
      const isApproved = await nftContract.isApprovedForAll(signerAddress, marketplaceAddress);
      
      if (!isApproved) {
        // First time: Set approval for all future NFTs (one-time)
        console.log("Setting marketplace approval (one-time)...");
        const approveTx = await nftContract.setApprovalForAll(marketplaceAddress, true);
        await approveTx.wait();
        console.log("Marketplace approved for all future NFTs");
      } else {
        console.log("Marketplace already approved");
      }

      // Now list the NFT on the marketplace
      console.log("Listing NFT on marketplace...");
      const marketplaceContract = getMarketplaceWriteContract(signer);
      
      // Convert INR price to ETH (approximate: 1 ETH = 250000 INR)
      const ETH_TO_INR = 250000;
      const priceEth = Number(priceInr) / ETH_TO_INR;
      const priceWei = BigInt(Math.floor(priceEth * 1e18));
      
      const listTx = await marketplaceContract.listItem(
        contractAddress,  // NFT contract address
        tokenId,          // Token ID
        priceWei          // Price in wei
      );
      await listTx.wait();
      console.log("NFT listed on marketplace!");

      // Add to my products
      const newProduct: ProductListing = {
        id: `prod-${Date.now()}`,
        title,
        category,
        description,
        priceInr: Number(priceInr),
        proofImages: imagePreviewUrls,
        proofVideos: videoPreviewUrls,
        nftToken: tokenId,
        txHash: tx.hash,
        nftContractAddress: contractAddress,
        status: "listed",
        createdAt: new Date(),
      };

      setMyProducts((prev) => [newProduct, ...prev]);
      setFormStep("success");
    } catch (error) {
      console.error("Minting error:", error);
      setMintError(
        error instanceof Error
          ? error.message.includes("user rejected")
            ? "Transaction was rejected by user"
            : error.message.includes("Missing NEXT_PUBLIC_NFT_CONTRACT_ADDRESS")
            ? "NFT contract not deployed. Please deploy the contract first."
            : error.message
          : "Failed to mint NFT"
      );
    } finally {
      setIsPosting(false);
    }
  };

  // Copy token to clipboard
  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
    }
  };

  // Calculate stats
  const myListedCount = myProducts.filter((p) => p.status === "listed").length;
  const mySoldCount = myProducts.filter((p) => p.status === "sold").length;
  const totalEarnings = myProducts
    .filter((p) => p.status === "sold")
    .reduce((acc, p) => acc + p.priceInr, 0);

  return (
    <AuthGuard role="seller">
      <main className="min-h-screen bg-[color:var(--artisol-bg)]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Seller Dashboard</h1>
              <p className="mt-1 text-slate-600">Manage your artisan products on ArtiSol</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={loadStats} disabled={loadingStats}>
                {loadingStats ? "Refreshing…" : "Refresh"}
              </Button>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Listing
              </Button>
            </div>
          </div>

          {statsError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {statsError}
            </div>
          )}

          {/* Stats Grid */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active Listings"
              value={String(myListedCount)}
              sub="Products available"
              icon={<Package className="h-6 w-6" />}
              gradient="linear-gradient(135deg, #0D7B7A 0%, #14a8a6 100%)"
            />
            <StatCard
              label="Products Sold"
              value={String(mySoldCount)}
              sub="Total sales"
              icon={<CheckCircle2 className="h-6 w-6" />}
              gradient="linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)"
            />
            <StatCard
              label="Total Earnings"
              value={`₹${totalEarnings.toLocaleString()}`}
              sub="From sold products"
              icon={<IndianRupee className="h-6 w-6" />}
              gradient="linear-gradient(135deg, #D4A574 0%, #E9C9A8 100%)"
            />
            <StatCard
              label="NFTs Minted"
              value={String(myProducts.length)}
              sub="On blockchain"
              icon={<Shield className="h-6 w-6" />}
              gradient="linear-gradient(135deg, #EC4899 0%, #F472B6 100%)"
            />
          </div>

          {/* Main Content Grid */}
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-1"
            >
              <Card className="relative overflow-hidden border border-[#0D7B7A]/20 bg-gradient-to-br from-white via-teal-50/50 to-[#0D7B7A]/10 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0D7B7A] via-[#14a8a6] to-[#D4A574]" />
                
                <CardHeader className="relative">
                  <CardTitle className="text-xl font-bold text-slate-800">Seller Profile</CardTitle>
                  <CardDescription className="text-slate-500">Your account summary</CardDescription>
                </CardHeader>

                <div className="relative space-y-4 px-6 pb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Email</span>
                    <span className="font-semibold text-slate-800">{session?.email ?? "—"}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Role</span>
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                      ✓ Verified Seller
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
                      <Button onClick={connectWallet} className="w-full bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6] hover:from-[#0a6665] hover:to-[#0D7B7A] border-0 shadow-lg shadow-[#0D7B7A]/25">
                        Connect Wallet
                      </Button>
                    )}
                    {walletError && (
                      <div className="mt-2 text-xs text-rose-600">{walletError}</div>
                    )}
                  </div>

                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Active Listings</span>
                      <span className="text-lg font-bold text-[#0D7B7A]">{myListedCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Products Sold</span>
                      <span className="text-lg font-bold text-[#D4A574]">{mySoldCount}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* My Products */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="lg:col-span-2"
            >
              <Card className="relative overflow-hidden border border-[#D4A574]/20 bg-gradient-to-br from-white via-amber-50/30 to-[#D4A574]/10 shadow-xl hover:shadow-2xl transition-shadow duration-300">
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A574] via-[#E9C9A8] to-[#0D7B7A]" />
                
                <CardHeader className="relative">
                  <CardTitle className="text-xl font-bold text-slate-800">My Products</CardTitle>
                  <CardDescription className="text-slate-500">Your listed NFT products</CardDescription>
                </CardHeader>

                {myProducts.length === 0 ? (
                  <div className="relative flex flex-col items-center justify-center py-12 text-center px-6">
                    <div className="rounded-full bg-[#D4A574]/10 p-5 border border-[#D4A574]/20">
                      <Package className="h-10 w-10 text-[#D4A574]" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-800">No products listed yet</p>
                    <p className="mt-1 text-sm text-slate-500">Click &quot;Create Listing&quot; to add your first product</p>
                  </div>
                ) : (
                  <div className="relative grid gap-4 sm:grid-cols-2 px-6 pb-6">
                    {myProducts.map((product, idx) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md transition-all duration-300 hover:border-[#0D7B7A]/30 hover:shadow-xl hover:shadow-[#0D7B7A]/10"
                      >
                        {/* Product Image */}
                        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                          {product.proofImages[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.proofImages[0]}
                              alt={product.title}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-slate-300" />
                            </div>
                          )}
                          <Badge
                            className={cn(
                              "absolute right-3 top-3 shadow-md",
                              product.status === "listed"
                                ? "bg-emerald-500 text-white border-0"
                                : "bg-amber-500 text-white border-0"
                            )}
                          >
                            {product.status === "listed" ? "✓ Listed" : "Sold"}
                          </Badge>
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                          <h3 className="font-bold text-slate-800 truncate text-lg">{product.title}</h3>
                          <p className="mt-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">{product.category}</p>
                          
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-2xl font-extrabold text-[#0D7B7A]">
                              ₹{product.priceInr.toLocaleString()}
                            </span>
                          </div>

                          {/* NFT Token */}
                          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-[#0D7B7A]" />
                                <span className="text-xs font-medium text-slate-500">Token ID</span>
                              </div>
                              <span className="font-mono text-xs font-bold text-slate-700">
                                #{product.nftToken}
                              </span>
                            </div>
                          </div>

                          {/* Etherscan Link */}
                          {product.txHash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${product.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0D7B7A] to-[#14a8a6] px-3 py-2.5 text-xs font-semibold text-white transition-all duration-300 hover:shadow-lg hover:shadow-[#0D7B7A]/30 hover:scale-[1.02]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              View on Etherscan
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          {/* Blockchain Orders Section - Orders from the actual blockchain */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="relative overflow-hidden border border-blue-200 bg-gradient-to-br from-white via-blue-50/50 to-blue-100/30 shadow-xl">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500" />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Package className="h-5 w-5 text-blue-500" />
                      Orders (from Blockchain)
                    </CardTitle>
                    <CardDescription className="text-slate-500">
                      All purchases made on your listings - click to confirm and ship
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={fetchBlockchainOrders}
                      disabled={loadingBlockchainOrders || !wallet}
                      size="sm"
                      variant="ghost"
                    >
                      {loadingBlockchainOrders ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Refresh</>
                      )}
                    </Button>
                    {blockchainOrders.length > 0 && (
                      <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-lg px-3 py-1">
                        {blockchainOrders.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              {!wallet ? (
                <div className="px-6 pb-6">
                  <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center">
                    <p className="text-slate-600">Connect your wallet to see orders</p>
                    <Button onClick={connectWallet} className="mt-3">
                      Connect Wallet
                    </Button>
                  </div>
                </div>
              ) : loadingBlockchainOrders ? (
                <div className="flex items-center justify-center py-12 px-6">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-3 text-slate-600">Loading orders from blockchain...</span>
                </div>
              ) : blockchainOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="rounded-full bg-blue-100 p-4">
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="mt-4 text-slate-600">No orders yet</p>
                  <p className="text-sm text-slate-500">Orders will appear here when buyers purchase your products</p>
                </div>
              ) : (
                <div className="space-y-4 px-6 pb-6">
                  {blockchainOrders.map((order, idx) => (
                    <motion.div
                      key={`${order.nftContract}-${order.tokenId}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row">
                        {/* Product Image */}
                        <div className="relative w-full lg:w-48 aspect-video lg:aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
                          {order.metadata?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={order.metadata.image}
                              alt={order.metadata.name || "Product"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-12 w-12 text-slate-300" />
                            </div>
                          )}
                          {/* Status Badge */}
                          <Badge className={cn(
                            "absolute top-2 right-2 border-0",
                            order.status === PurchaseStatus.ESCROW && "bg-blue-500 text-white",
                            order.status === PurchaseStatus.DELIVERED && "bg-amber-500 text-white",
                            order.status === PurchaseStatus.COMPLETED && "bg-emerald-500 text-white",
                          )}>
                            {order.status === PurchaseStatus.ESCROW && "💰 Payment Received"}
                            {order.status === PurchaseStatus.DELIVERED && "📦 Shipped"}
                            {order.status === PurchaseStatus.COMPLETED && "✓ Completed"}
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">
                                {order.metadata?.name || `Token #${order.tokenId}`}
                              </h3>
                              <p className="text-sm text-slate-500">Token ID: {order.tokenId}</p>
                            </div>
                            <span className="text-xl font-extrabold text-[#0D7B7A]">
                              {order.priceEth} ETH
                            </span>
                          </div>

                          {/* Buyer Info */}
                          <div className="mt-4 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-500">
                              <User className="h-4 w-4" />
                              <span>Buyer: {order.buyer.slice(0, 6)}...{order.buyer.slice(-4)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(order.purchaseTime * 1000).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Escrow Info */}
                          {order.status === PurchaseStatus.ESCROW && (
                            <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">
                                  Funds held in escrow: {order.priceEth} ETH
                                </span>
                              </div>
                              <p className="text-xs text-blue-600 mt-1">
                                Click "Confirm & Ship" to notify the buyer that the order is on its way
                              </p>
                            </div>
                          )}

                          {order.status === PurchaseStatus.DELIVERED && (
                            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-medium text-amber-700">
                                  Waiting for buyer to confirm delivery
                                </span>
                              </div>
                            </div>
                          )}

                          {order.status === PurchaseStatus.COMPLETED && (
                            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-700">
                                  Transaction complete! Payment released to your wallet.
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="mt-4 flex flex-wrap gap-3">
                            {order.status === PurchaseStatus.ESCROW && (
                              <Button
                                onClick={() => handleBlockchainShipOrder(order)}
                                disabled={isShipping === order.tokenId}
                                className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500"
                              >
                                {isShipping === order.tokenId ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <Send className="mr-2 h-4 w-4" />
                                    Confirm & Ship Order
                                  </>
                                )}
                              </Button>
                            )}
                            <a
                              href={`https://sepolia.etherscan.io/address/${order.nftContract}?a=${order.tokenId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View on Etherscan
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>

          {/* New Orders Section - Waiting for seller to confirm and ship */}
          {newOrders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <Card className="relative overflow-hidden border border-blue-200 bg-gradient-to-br from-white via-blue-50/50 to-blue-100/30 shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500" />
                
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="h-5 w-5 text-blue-500" />
                        New Orders
                      </CardTitle>
                      <CardDescription className="text-slate-500">
                        Buyers have paid - confirm and ship these orders
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 border border-blue-300 text-lg px-3 py-1">
                      {newOrders.length}
                    </Badge>
                  </div>
                </CardHeader>

                <div className="space-y-4 px-6 pb-6">
                  {newOrders.map((purchase, idx) => (
                    <motion.div
                      key={purchase.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row">
                        {/* Product Image */}
                        <div className="relative w-full lg:w-48 aspect-video lg:aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
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
                          <Badge className="absolute top-2 right-2 bg-blue-500 text-white border-0">
                            💰 Payment Received
                          </Badge>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{purchase.productName}</h3>
                              <p className="text-sm text-slate-500">{purchase.category}</p>
                            </div>
                            <span className="text-xl font-extrabold text-[#0D7B7A]">
                              ₹{purchase.priceInr.toLocaleString()}
                            </span>
                          </div>

                          {/* Buyer Info */}
                          <div className="mt-4 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-500">
                              <User className="h-4 w-4" />
                              <span>Buyer: {purchase.buyerEmail || purchase.buyerWallet.slice(0, 10) + "..."}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Delivery Address */}
                          {purchase.deliveryAddress && (
                            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                              <div className="flex items-center gap-2 mb-2">
                                <Send className="h-4 w-4 text-[#0D7B7A]" />
                                <span className="text-sm font-semibold text-slate-700">Ship to:</span>
                              </div>
                              <div className="text-sm text-slate-600">
                                <p className="font-medium">{purchase.deliveryAddress.fullName}</p>
                                <p>{purchase.deliveryAddress.addressLine1}</p>
                                {purchase.deliveryAddress.addressLine2 && <p>{purchase.deliveryAddress.addressLine2}</p>}
                                <p>{purchase.deliveryAddress.city}, {purchase.deliveryAddress.state} - {purchase.deliveryAddress.pincode}</p>
                                <p className="mt-1">📞 {purchase.deliveryAddress.phone}</p>
                              </div>
                            </div>
                          )}

                          {/* Escrow Info */}
                          <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-700">
                                Funds held in escrow: {purchase.priceEth} ETH
                              </span>
                            </div>
                            <p className="text-xs text-blue-600 mt-1">
                              Funds will be released after buyer confirms delivery
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                              onClick={() => handleShipOrder(purchase)}
                              disabled={isShipping === purchase.id}
                              className="bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500"
                            >
                              {isShipping === purchase.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Confirm & Ship Order
                                </>
                              )}
                            </Button>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${purchase.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Payment Tx
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Pending Approvals Section */}
          {pendingApprovals.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <Card className="relative overflow-hidden border border-amber-200 bg-gradient-to-br from-white via-amber-50/50 to-amber-100/30 shadow-xl">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500" />
                
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-amber-500" />
                        Pending Buyer Approvals
                      </CardTitle>
                      <CardDescription className="text-slate-500">
                        Buyers have confirmed receipt - review and approve to transfer NFT
                      </CardDescription>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border border-amber-300 text-lg px-3 py-1">
                      {pendingApprovals.length}
                    </Badge>
                  </div>
                </CardHeader>

                <div className="space-y-4 px-6 pb-6">
                  {pendingApprovals.map((purchase, idx) => (
                    <motion.div
                      key={purchase.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-md"
                    >
                      <div className="flex flex-col lg:flex-row">
                        {/* Product Image */}
                        <div className="relative w-full lg:w-48 aspect-video lg:aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50">
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

                        {/* Content */}
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-slate-800 text-lg">{purchase.productName}</h3>
                              <p className="text-sm text-slate-500">{purchase.category}</p>
                            </div>
                            <span className="text-xl font-extrabold text-[#0D7B7A]">
                              ₹{purchase.priceInr.toLocaleString()}
                            </span>
                          </div>

                          {/* Buyer Info */}
                          <div className="mt-4 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-500">
                              <User className="h-4 w-4" />
                              <span>Buyer: {purchase.buyerEmail}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500">
                              <Clock className="h-4 w-4" />
                              <span>{new Date(purchase.purchaseDate).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {/* Buyer Feedback */}
                          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                            <div className="flex items-center gap-2 mb-2">
                              <ThumbsUp className="h-4 w-4 text-emerald-600" />
                              <span className="text-sm font-semibold text-emerald-700">Buyer Confirmed: Product is Good</span>
                            </div>
                            <p className="text-sm text-emerald-800">{purchase.buyerFeedback}</p>
                            
                            {/* Buyer Photos */}
                            {purchase.deliveryPhotos.length > 0 && (
                              <div className="mt-3 flex gap-2">
                                {purchase.deliveryPhotos.map((photo, i) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={i}
                                    src={photo}
                                    alt={`Buyer photo ${i + 1}`}
                                    className="h-16 w-16 rounded-lg object-cover border border-emerald-200"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-4 flex flex-wrap gap-3">
                            <Button
                              onClick={() => setSelectedApproval(purchase)}
                              className="bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Approve & Transfer NFT
                            </Button>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${purchase.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View Original Tx
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Approval Modal */}
          <AnimatePresence>
            {selectedApproval && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !isApproving) {
                    setSelectedApproval(null);
                    setApprovalResponse("");
                  }
                }}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Approve & Transfer NFT</h2>
                      <p className="text-sm text-slate-500">Finalize the transaction</p>
                    </div>
                    {!isApproving && (
                      <button
                        onClick={() => {
                          setSelectedApproval(null);
                          setApprovalResponse("");
                        }}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      {selectedApproval.productImage && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedApproval.productImage}
                          alt={selectedApproval.productName}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <h3 className="font-bold text-slate-800">{selectedApproval.productName}</h3>
                        <p className="text-sm text-slate-500">To: {selectedApproval.buyerEmail}</p>
                      </div>
                    </div>

                    {/* Response Message */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Response Message (Optional)
                      </label>
                      <textarea
                        value={approvalResponse}
                        onChange={(e) => setApprovalResponse(e.target.value)}
                        placeholder="Thank you for your purchase! We hope you enjoy the product..."
                        rows={3}
                        disabled={isApproving === selectedApproval.id}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-[#0D7B7A] focus:outline-none focus:ring-2 focus:ring-[#0D7B7A]/20 disabled:opacity-50"
                      />
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-sm text-emerald-700">
                        <p className="font-semibold">What happens when you approve?</p>
                        <p className="mt-1">The NFT will be transferred to the buyer&apos;s wallet address. This action cannot be undone.</p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500"
                      disabled={isApproving === selectedApproval.id}
                      onClick={() => handleApprove(selectedApproval)}
                    >
                      {isApproving === selectedApproval.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transferring NFT...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Approve & Transfer NFT
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Create Listing Modal */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget && formStep !== "success") {
                  resetForm();
                }
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
              >
                {/* Modal Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {formStep === "details" && "Product Details"}
                      {formStep === "proofs" && "Authenticity Proofs"}
                      {formStep === "preview" && "Preview Listing"}
                      {formStep === "success" && "Success!"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {formStep === "details" && "Step 1 of 3 — Enter product information"}
                      {formStep === "proofs" && "Step 2 of 3 — Upload proof images and videos"}
                      {formStep === "preview" && "Step 3 of 3 — Review and post your listing"}
                      {formStep === "success" && "Your NFT has been minted"}
                    </p>
                  </div>
                  {formStep !== "success" && (
                    <button
                      onClick={resetForm}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Step Progress */}
                {formStep !== "success" && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    {["details", "proofs", "preview"].map((step, index) => (
                      <React.Fragment key={step}>
                        <div
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                            formStep === step
                              ? "bg-[color:var(--artisol-primary)] text-white"
                              : ["details", "proofs", "preview"].indexOf(formStep) > index
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-200 text-slate-500"
                          )}
                        >
                          {["details", "proofs", "preview"].indexOf(formStep) > index ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        {index < 2 && (
                          <div
                            className={cn(
                              "h-0.5 w-12",
                              ["details", "proofs", "preview"].indexOf(formStep) > index
                                ? "bg-emerald-500"
                                : "bg-slate-200"
                            )}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* Form Content */}
                <div className="p-6">
                  {/* Step 1: Details */}
                  {formStep === "details" && (
                    <div className="space-y-5">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Product Title <span className="text-rose-500">*</span>
                        </label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g. Handwoven Banarasi Silk Saree"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Category <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className={cn(
                            "h-11 w-full rounded-xl border px-3 text-sm",
                            "border-slate-300 bg-white text-slate-900",
                            "focus:outline-none focus:ring-2 focus:ring-[color:var(--artisol-primary)]"
                          )}
                        >
                          <option value="">Select a category</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Description <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={4}
                          placeholder="Describe your product, materials used, crafting process, story..."
                          className={cn(
                            "w-full rounded-xl border px-3 py-2.5 text-sm",
                            "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
                            "focus:outline-none focus:ring-2 focus:ring-[color:var(--artisol-primary)]"
                          )}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">
                          Sale Price (INR) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                          <Input
                            type="number"
                            value={priceInr}
                            onChange={(e) => setPriceInr(e.target.value)}
                            placeholder="25000"
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Proofs */}
                  {formStep === "proofs" && (
                    <div className="space-y-6">
                      {/* Image Upload */}
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <ImageIcon className="h-4 w-4" />
                          Product Images <span className="text-rose-500">*</span>
                        </label>
                        <p className="mb-3 text-xs text-slate-500">
                          Upload clear images showing your product and proof of authenticity
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {imagePreviewUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          
                          <label
                            className={cn(
                              "flex cursor-pointer flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed transition-colors",
                              "border-slate-300 bg-slate-50 hover:border-[color:var(--artisol-primary)] hover:bg-[color:var(--artisol-primary)]/5"
                            )}
                          >
                            <Upload className="h-6 w-6 text-slate-400" />
                            <span className="mt-1 text-xs text-slate-500">Add Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Video Upload */}
                      <div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                          <FileVideo className="h-4 w-4" />
                          Authenticity Videos <span className="text-slate-400">(Optional)</span>
                        </label>
                        <p className="mb-3 text-xs text-slate-500">
                          Upload videos showing the crafting process or product details
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {videoPreviewUrls.map((url, index) => (
                            <div key={index} className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
                              <video src={url} className="h-full w-full object-cover" />
                              <button
                                onClick={() => removeVideo(index)}
                                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-black/80"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <FileVideo className="h-8 w-8 text-white/80" />
                              </div>
                            </div>
                          ))}
                          
                          <label
                            className={cn(
                              "flex cursor-pointer flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed transition-colors",
                              "border-slate-300 bg-slate-50 hover:border-[color:var(--artisol-primary)] hover:bg-[color:var(--artisol-primary)]/5"
                            )}
                          >
                            <FileVideo className="h-6 w-6 text-slate-400" />
                            <span className="mt-1 text-xs text-slate-500">Add Video</span>
                            <input
                              type="file"
                              accept="video/*"
                              multiple
                              onChange={handleVideoUpload}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Preview */}
                  {formStep === "preview" && (
                    <div className="space-y-6">
                      {/* Preview Card */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {/* Image Gallery */}
                        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[color:var(--artisol-primary)]/10 to-[color:var(--artisol-secondary)]/20">
                          {imagePreviewUrls[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imagePreviewUrls[0]}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-16 w-16 text-slate-300" />
                            </div>
                          )}
                          <Badge className="absolute left-3 top-3 bg-[color:var(--artisol-primary)] text-white">
                            Preview
                          </Badge>
                          {imagePreviewUrls.length > 1 && (
                            <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                              +{imagePreviewUrls.length - 1} more
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-4 space-y-4">
                          <div>
                            <h3 className="text-xl font-semibold text-slate-900">{title || "Product Title"}</h3>
                            <div className="mt-1 flex items-center gap-2">
                              <Badge className="bg-slate-100 text-slate-600">{category || "Category"}</Badge>
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 line-clamp-3">
                            {description || "Product description will appear here..."}
                          </p>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                            <div>
                              <div className="text-xs text-slate-500">Sale Price</div>
                              <div className="text-2xl font-bold text-[color:var(--artisol-primary)]">
                                ₹{Number(priceInr || 0).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-500">Proofs Uploaded</div>
                              <div className="flex items-center gap-2 text-sm text-slate-700">
                                <ImageIcon className="h-4 w-4" /> {imagePreviewUrls.length}
                                <FileVideo className="h-4 w-4 ml-2" /> {videoPreviewUrls.length}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Warning */}
                      {!wallet && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-amber-800">Wallet Not Connected</h4>
                              <p className="mt-1 text-sm text-amber-700">
                                Please connect your MetaMask wallet before minting. The NFT will be minted to your connected wallet address.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mint Error */}
                      {mintError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5" />
                            <div>
                              <h4 className="font-medium text-rose-800">Minting Error</h4>
                              <p className="mt-1 text-sm text-rose-700">{mintError}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Blockchain Info */}
                      <div className="rounded-xl border border-[color:var(--artisol-primary)]/20 bg-[color:var(--artisol-primary)]/5 p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="h-5 w-5 text-[color:var(--artisol-primary)] mt-0.5" />
                          <div>
                            <h4 className="font-medium text-slate-900">Blockchain Verification (Sepolia Testnet)</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Upon posting, a unique NFT will be minted on the Ethereum Sepolia testnet.
                              You can verify it on Etherscan. Make sure you have Sepolia ETH for gas fees.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success State */}
                  {formStep === "success" && generatedToken && (
                    <div className="flex flex-col items-center py-6 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="rounded-full bg-emerald-100 p-4"
                      >
                        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                      </motion.div>

                      <h3 className="mt-6 text-xl font-semibold text-slate-900">
                        NFT Successfully Minted on Blockchain!
                      </h3>
                      <p className="mt-2 text-sm text-slate-600">
                        Your product NFT has been permanently recorded on the Ethereum blockchain.
                      </p>

                      {/* Token ID Display */}
                      <div className="mt-6 w-full max-w-md space-y-3">
                        <div className="rounded-xl border-2 border-dashed border-[color:var(--artisol-primary)]/30 bg-[color:var(--artisol-primary)]/5 p-4">
                          <div className="text-xs text-slate-500 mb-2">NFT Token ID</div>
                          <div className="flex items-center justify-center gap-2">
                            <code className="text-2xl font-mono font-bold text-[color:var(--artisol-primary)]">
                              #{generatedToken}
                            </code>
                            <button
                              onClick={copyToken}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                              title="Copy Token ID"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Contract Address */}
                        {nftContractAddr && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500 mb-1">Contract Address</div>
                            <div className="flex items-center justify-center gap-2">
                              <code className="text-xs font-mono text-slate-700 truncate max-w-[200px]">
                                {nftContractAddr}
                              </code>
                              <button
                                onClick={() => navigator.clipboard.writeText(nftContractAddr)}
                                className="rounded p-1 text-slate-400 hover:text-slate-600"
                                title="Copy Address"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Transaction Hash with Etherscan Link */}
                        {txHash && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs text-slate-500 mb-1">Transaction Hash</div>
                            <div className="flex items-center justify-center gap-2">
                              <code className="text-xs font-mono text-slate-700 truncate max-w-[180px]">
                                {txHash}
                              </code>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-[color:var(--artisol-primary)] px-2 py-1 text-xs text-white hover:opacity-90"
                              >
                                View on Etherscan
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      <p className="mt-4 text-xs text-slate-500 max-w-sm">
                        This NFT is now verifiable on Etherscan or any Ethereum block explorer. 
                        The token proves your product&apos;s authenticity permanently.
                      </p>

                      <div className="mt-6 flex gap-3">
                        {txHash && (
                          <a
                            href={`https://sepolia.etherscan.io/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Verify on Etherscan
                          </a>
                        )}
                        <Button onClick={resetForm}>
                          Back to Dashboard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                {formStep !== "success" && (
                  <div className="sticky bottom-0 flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
                    <div>
                      {formStep !== "details" && (
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (formStep === "proofs") setFormStep("details");
                            if (formStep === "preview") setFormStep("proofs");
                          }}
                        >
                          <ArrowLeft className="mr-2 h-4 w-4" />
                          Back
                        </Button>
                      )}
                    </div>

                    <div>
                      {formStep === "details" && (
                        <Button
                          onClick={() => setFormStep("proofs")}
                          disabled={!title || !category || !description || !priceInr}
                        >
                          Next
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                      {formStep === "proofs" && (
                        <Button
                          onClick={() => setFormStep("preview")}
                          disabled={imagePreviewUrls.length === 0}
                        >
                          Preview
                          <Eye className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                      {formStep === "preview" && (
                        <Button onClick={handlePost} disabled={isPosting}>
                          {isPosting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Minting NFT...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Post & Mint NFT
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AuthGuard>
  );
}
