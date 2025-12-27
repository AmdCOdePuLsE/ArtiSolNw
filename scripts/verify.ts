import hre from "hardhat";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const nftContractAddress = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;
  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  console.log("Starting contract verification on Etherscan...\n");

  // Verify ArtisolNFT if address exists
  if (nftContractAddress) {
    console.log(`Verifying ArtisolNFT at ${nftContractAddress}...`);
    try {
      await hre.run("verify:verify", {
        address: nftContractAddress,
        constructorArguments: [],
      });
      console.log("ArtisolNFT verified successfully!\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("ArtisolNFT is already verified.\n");
      } else {
        console.error("Error verifying ArtisolNFT:", error.message, "\n");
      }
    }
  }

  // Verify Marketplace if address exists
  if (marketplaceAddress) {
    console.log(`Verifying Marketplace at ${marketplaceAddress}...`);
    try {
      await hre.run("verify:verify", {
        address: marketplaceAddress,
        constructorArguments: [],
      });
      console.log("Marketplace verified successfully!\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Marketplace is already verified.\n");
      } else {
        console.error("Error verifying Marketplace:", error.message, "\n");
      }
    }
  }

  // Verify any additional contract if address exists
  if (contractAddress) {
    console.log(`Verifying contract at ${contractAddress}...`);
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("Contract is already verified.\n");
      } else {
        console.error("Error verifying contract:", error.message, "\n");
      }
    }
  }

  console.log("========================================");
  console.log("Verification process complete!");
  console.log("========================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
