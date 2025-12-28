import { Contract, providers, type Signer, utils } from "ethers";

export const ARTISOL_NFT_ABI = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "mintNFT",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" },
      { name: "productHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getCurrentTokenId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getNFTDetails",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "artisan", type: "address" },
      { name: "uri", type: "string" },
      { name: "productHash", type: "bytes32" },
      { name: "mintTimestamp", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "verifyProduct",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "hash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "NFTMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "artisan", type: "address", indexed: true },
      { name: "tokenURI", type: "string", indexed: false },
      { name: "productHash", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

// Fallback NFT contract address for Sepolia testnet
const FALLBACK_NFT_ADDRESS = "0x4BF3114037896dEaEAEE3299306C57f2f95aB664";

export function getArtisolNFTAddress(): string {
  const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || FALLBACK_NFT_ADDRESS;
  console.log("Using NFT Address:", address);
  return address;
}

export function getArtisolNFTReadContract(provider: providers.Provider) {
  return new Contract(getArtisolNFTAddress(), ARTISOL_NFT_ABI, provider);
}

export function getArtisolNFTWriteContract(signer: Signer) {
  return new Contract(getArtisolNFTAddress(), ARTISOL_NFT_ABI, signer);
}

/**
 * Generate a product hash from metadata for on-chain verification
 */
export function generateProductHash(metadata: {
  title: string;
  category: string;
  description: string;
  priceInr: number;
  artisan: string;
}): string {
  const data = JSON.stringify({
    title: metadata.title,
    category: metadata.category,
    description: metadata.description,
    priceInr: metadata.priceInr,
    artisan: metadata.artisan.toLowerCase(),
    timestamp: Date.now(),
  });
  return utils.keccak256(utils.toUtf8Bytes(data));
}

/**
 * Generate a token URI with metadata (in production, upload to IPFS)
 */
export function generateTokenURI(metadata: {
  title: string;
  category: string;
  description: string;
  priceInr: number;
  images: string[];
  artisan: string;
}): string {
  // For production, upload to IPFS and return ipfs:// URI
  // For now, we'll use a data URI with JSON metadata
  const nftMetadata = {
    name: metadata.title,
    description: metadata.description,
    attributes: [
      { trait_type: "Category", value: metadata.category },
      { trait_type: "Price (INR)", value: metadata.priceInr.toString() },
      { trait_type: "Artisan", value: metadata.artisan },
      { trait_type: "Platform", value: "ArtiSol" },
    ],
    image: metadata.images[0] || "",
  };
  
  // Base64 encode the metadata for data URI
  const jsonString = JSON.stringify(nftMetadata);
  const base64 = typeof window !== 'undefined' 
    ? btoa(jsonString)
    : Buffer.from(jsonString).toString('base64');
  
  return `data:application/json;base64,${base64}`;
}
