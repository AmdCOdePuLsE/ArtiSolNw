/**
 * IPFS Upload Utility using Pinata
 * 
 * To get your Pinata API keys:
 * 1. Go to https://app.pinata.cloud/
 * 2. Sign up for free (1GB free storage)
 * 3. Go to API Keys → New Key → Create
 * 4. Copy the API Key and Secret
 * 5. Add to .env.local:
 *    NEXT_PUBLIC_PINATA_API_KEY=your_api_key
 *    NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key
 */

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || "";
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs";

export interface UploadResult {
  success: boolean;
  ipfsHash?: string;
  ipfsUrl?: string;
  error?: string;
}

/**
 * Check if Pinata is configured
 */
export function isPinataConfigured(): boolean {
  return !!(PINATA_API_KEY && PINATA_SECRET_KEY);
}

/**
 * Upload a file to IPFS via Pinata
 */
export async function uploadToIPFS(file: File): Promise<UploadResult> {
  if (!isPinataConfigured()) {
    return {
      success: false,
      error: "Pinata API keys not configured. Add NEXT_PUBLIC_PINATA_API_KEY and NEXT_PUBLIC_PINATA_SECRET_KEY to .env.local",
    };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        platform: "ArtiSol",
        type: "product-image",
        uploadedAt: new Date().toISOString(),
      },
    });
    formData.append("pinataMetadata", metadata);

    // Upload to Pinata
    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;
    const ipfsUrl = `${PINATA_GATEWAY}/${ipfsHash}`;

    console.log("Uploaded to IPFS:", ipfsUrl);

    return {
      success: true,
      ipfsHash,
      ipfsUrl,
    };
  } catch (error) {
    console.error("IPFS upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to upload to IPFS",
    };
  }
}

/**
 * Upload multiple files to IPFS
 */
export async function uploadMultipleToIPFS(files: File[]): Promise<UploadResult[]> {
  const results: UploadResult[] = [];
  
  for (const file of files) {
    const result = await uploadToIPFS(file);
    results.push(result);
  }
  
  return results;
}

/**
 * Convert a blob URL to a File object (for re-uploading)
 */
export async function blobUrlToFile(blobUrl: string, filename: string): Promise<File | null> {
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    return new File([blob], filename, { type: blob.type });
  } catch (error) {
    console.error("Failed to convert blob URL to file:", error);
    return null;
  }
}

/**
 * Get IPFS gateway URL from hash
 */
export function getIPFSUrl(hash: string): string {
  return `${PINATA_GATEWAY}/${hash}`;
}
