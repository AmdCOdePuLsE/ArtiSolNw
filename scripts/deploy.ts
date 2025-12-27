import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  try {
    const ethers = (connection as any).ethers;
    if (!ethers) {
      throw new Error(
        "Ethers plugin not found on network connection. Check hardhat.config.ts plugins.",
      );
    }

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy ArtisolNFT contract
    console.log("\n1. Deploying ArtisolNFT...");
    const ArtisolNFT = await ethers.getContractFactory("ArtisolNFT");
    const artisolNFT = await ArtisolNFT.deploy();
    await artisolNFT.waitForDeployment();
    const nftAddress = await artisolNFT.getAddress();
    console.log("   ArtisolNFT deployed to:", nftAddress);

    // Deploy Marketplace contract (Escrow-based)
    console.log("\n2. Deploying Marketplace (Escrow)...");
    const Marketplace = await ethers.getContractFactory("Marketplace");
    const marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();
    console.log("   Marketplace deployed to:", marketplaceAddress);

    // Log configuration
    console.log("\n========================================");
    console.log("         DEPLOYMENT COMPLETE");
    console.log("========================================");
    console.log("\nContract Addresses:");
    console.log(`  NFT Contract:         ${nftAddress}`);
    console.log(`  Marketplace Contract: ${marketplaceAddress}`);
    
    console.log("\n========================================");
    console.log("Add these to your .env.local file:");
    console.log("========================================");
    console.log(`NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=${nftAddress}`);
    console.log(`NEXT_PUBLIC_MARKETPLACE_ADDRESS=${marketplaceAddress}`);
    console.log(`NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`);
    console.log("========================================");
    
    console.log("\n========================================");
    console.log("         ESCROW FLOW SUMMARY");
    console.log("========================================");
    console.log("1. Seller mints NFT → Gets token ID");
    console.log("2. Seller approves marketplace for NFT");
    console.log("3. Seller lists NFT with price");
    console.log("4. Buyer pays → Funds held in escrow");
    console.log("5. Seller ships physical product");
    console.log("6. Seller marks as delivered");
    console.log("7. Buyer confirms → NFT transfers, funds release");
    console.log("========================================\n");

  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
