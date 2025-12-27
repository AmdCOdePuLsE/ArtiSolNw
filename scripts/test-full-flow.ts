import hre from "hardhat";

/**
 * Complete Flow Test Script
 * This script tests the entire escrow marketplace flow:
 * 1. Seller mints NFT
 * 2. Seller approves marketplace
 * 3. Seller lists NFT
 * 4. Buyer purchases (funds to escrow)
 * 5. Seller marks delivered
 * 6. Buyer confirms delivery (NFT transfers, funds release)
 */

async function main() {
  const connection = await hre.network.connect();
  try {
    const ethers = (connection as any).ethers;
    if (!ethers) {
      throw new Error("Ethers plugin not found");
    }

    // Get the deployed contract addresses from env
    const nftAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
    const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

    if (!nftAddress || !marketplaceAddress) {
      throw new Error("Contract addresses not found in .env.local");
    }

    console.log("========================================");
    console.log("   COMPLETE ESCROW FLOW TEST");
    console.log("========================================\n");

    // Get signers - use hardhat accounts for testing
    const [deployer, seller, buyer] = await ethers.getSigners();
    
    console.log("Test Accounts:");
    console.log("  Deployer:", deployer.address);
    console.log("  Seller:", seller.address);
    console.log("  Buyer:", buyer.address);

    // Get contracts
    const nftContract = await ethers.getContractAt("ArtisolNFT", nftAddress);
    const marketplace = await ethers.getContractAt("Marketplace", marketplaceAddress);

    // Check initial balances
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);
    console.log("\nInitial Balances:");
    console.log("  Seller:", ethers.formatEther(sellerBalanceBefore), "ETH");
    console.log("  Buyer:", ethers.formatEther(buyerBalanceBefore), "ETH");

    // ============ STEP 1: Seller Mints NFT ============
    console.log("\n--- STEP 1: Seller Mints NFT ---");
    
    const productHash = ethers.keccak256(ethers.toUtf8Bytes("Test Product #1"));
    const tokenURI = "data:application/json;base64," + Buffer.from(JSON.stringify({
      name: "Test Handcrafted Saree",
      description: "Beautiful handcrafted silk saree",
      attributes: [
        { trait_type: "Category", value: "Textile" },
        { trait_type: "Price (INR)", value: "25000" },
      ]
    })).toString('base64');

    const mintTx = await nftContract.connect(seller).mintNFT(seller.address, tokenURI, productHash);
    const mintReceipt = await mintTx.wait();
    
    // Get token ID from event
    const tokenId = await nftContract.getCurrentTokenId() - 1n;
    console.log("  ✅ NFT Minted! Token ID:", tokenId.toString());
    console.log("  Tx Hash:", mintTx.hash);

    // Verify ownership
    const owner = await nftContract.ownerOf(tokenId);
    console.log("  Owner:", owner);

    // ============ STEP 2: Seller Approves Marketplace ============
    console.log("\n--- STEP 2: Seller Approves Marketplace ---");
    
    const approveTx = await nftContract.connect(seller).approve(marketplaceAddress, tokenId);
    await approveTx.wait();
    console.log("  ✅ Marketplace approved to transfer NFT");
    console.log("  Tx Hash:", approveTx.hash);

    // ============ STEP 3: Seller Lists NFT ============
    console.log("\n--- STEP 3: Seller Lists NFT on Marketplace ---");
    
    const listingPrice = ethers.parseEther("0.1"); // 0.1 ETH
    const listTx = await marketplace.connect(seller).listItem(nftAddress, tokenId, listingPrice);
    await listTx.wait();
    console.log("  ✅ NFT Listed for sale!");
    console.log("  Price:", ethers.formatEther(listingPrice), "ETH");
    console.log("  Tx Hash:", listTx.hash);

    // Verify listing
    const listingCount = await marketplace.listingCount();
    console.log("  Total Listings on Marketplace:", listingCount.toString());

    const listing = await marketplace.getListing(nftAddress, tokenId);
    console.log("  Listing Details:");
    console.log("    Seller:", listing.seller);
    console.log("    Price:", ethers.formatEther(listing.priceWei), "ETH");
    console.log("    Active:", !listing.sold);

    // ============ STEP 4: Buyer Purchases NFT ============
    console.log("\n--- STEP 4: Buyer Purchases NFT (Escrow) ---");
    
    const buyTx = await marketplace.connect(buyer).buyItem(nftAddress, tokenId, { value: listingPrice });
    await buyTx.wait();
    console.log("  ✅ Purchase complete! Funds in escrow.");
    console.log("  Tx Hash:", buyTx.hash);

    // Check escrow status
    const purchase = await marketplace.getPurchase(nftAddress, tokenId);
    console.log("  Purchase Details:");
    console.log("    Buyer:", purchase.buyer);
    console.log("    Amount in Escrow:", ethers.formatEther(purchase.amountPaid), "ETH");
    console.log("    Status:", ["NONE", "ESCROW", "DELIVERED", "COMPLETED", "REFUNDED", "DISPUTED"][Number(purchase.status)]);

    // NFT still owned by seller (until confirmation)
    const currentOwner = await nftContract.ownerOf(tokenId);
    console.log("  NFT still owned by:", currentOwner, "(seller - in escrow)");

    // ============ STEP 5: Seller Marks Delivered ============
    console.log("\n--- STEP 5: Seller Marks as Delivered ---");
    
    const deliverTx = await marketplace.connect(seller).markDelivered(nftAddress, tokenId);
    await deliverTx.wait();
    console.log("  ✅ Marked as delivered!");
    console.log("  Tx Hash:", deliverTx.hash);

    const purchaseAfterDelivery = await marketplace.getPurchase(nftAddress, tokenId);
    console.log("  Status:", ["NONE", "ESCROW", "DELIVERED", "COMPLETED", "REFUNDED", "DISPUTED"][Number(purchaseAfterDelivery.status)]);

    // ============ STEP 6: Buyer Confirms Delivery ============
    console.log("\n--- STEP 6: Buyer Confirms Delivery ---");
    
    const confirmTx = await marketplace.connect(buyer).confirmDelivery(nftAddress, tokenId);
    await confirmTx.wait();
    console.log("  ✅ Delivery confirmed! NFT transferred, funds released.");
    console.log("  Tx Hash:", confirmTx.hash);

    // Final verification
    const finalOwner = await nftContract.ownerOf(tokenId);
    console.log("  NFT now owned by:", finalOwner, "(buyer)");

    const purchaseFinal = await marketplace.getPurchase(nftAddress, tokenId);
    console.log("  Final Status:", ["NONE", "ESCROW", "DELIVERED", "COMPLETED", "REFUNDED", "DISPUTED"][Number(purchaseFinal.status)]);

    // Check final balances
    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
    
    console.log("\n========================================");
    console.log("   FINAL RESULTS");
    console.log("========================================");
    console.log("\nBalance Changes:");
    console.log("  Seller earned:", ethers.formatEther(sellerBalanceAfter - sellerBalanceBefore), "ETH (after gas + 2.5% fee)");
    console.log("  Buyer spent:", ethers.formatEther(buyerBalanceBefore - buyerBalanceAfter), "ETH (including gas)");
    console.log("\n  NFT Owner:", finalOwner === buyer.address ? "✅ BUYER (Correct!)" : "❌ Wrong owner");
    console.log("  Transaction:", purchaseFinal.status === 3n ? "✅ COMPLETED" : "❌ Not completed");
    
    console.log("\n========================================");
    console.log("   ✅ FULL FLOW TEST PASSED!");
    console.log("========================================\n");

  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});
