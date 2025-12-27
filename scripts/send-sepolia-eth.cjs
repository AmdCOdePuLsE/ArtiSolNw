const { ethers } = require("ethers");

async function main() {
  // Original deployment wallet with Sepolia ETH
  const SENDER_PRIVATE_KEY = "0xd519c08b00380f84ca9f4f885f96686c7ff46e4b50e68b20f10b855a2b179ce0";
  
  // New wallet that needs ETH
  const RECIPIENT_ADDRESS = "0xdB76065e805b4aC698799e76E3A4947316fEC77e";
  
  const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/hgBu-UD8N-2ZoBs_Ts17o";
  
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const senderWallet = new ethers.Wallet(SENDER_PRIVATE_KEY, provider);
  
  console.log("Sender wallet:", senderWallet.address);
  
  // Check sender balance
  const senderBalance = await provider.getBalance(senderWallet.address);
  console.log("Sender balance:", ethers.utils.formatEther(senderBalance), "ETH");
  
  if (senderBalance.lt(ethers.utils.parseEther("0.1"))) {
    console.log("❌ Sender doesn't have enough ETH");
    return;
  }
  
  // Send 0.5 ETH
  const amountToSend = ethers.utils.parseEther("0.5");
  
  console.log("\nSending 0.5 ETH to:", RECIPIENT_ADDRESS);
  
  const tx = await senderWallet.sendTransaction({
    to: RECIPIENT_ADDRESS,
    value: amountToSend,
  });
  
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  
  await tx.wait();
  
  console.log("✅ Successfully sent 0.5 Sepolia ETH!");
  
  // Check new balance
  const newBalance = await provider.getBalance(RECIPIENT_ADDRESS);
  console.log("Recipient new balance:", ethers.utils.formatEther(newBalance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
