import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  try {
    const ethers = (connection as any).ethers;
    if (!ethers) {
      throw new Error("Ethers plugin not found");
    }

    const [sender] = await ethers.getSigners();
    const recipient = "0x6d9a3de3b8b6786ad4a3c96b519d1b7a3ed6cb15";
    
    console.log("Sending 100 ETH from:", sender.address);
    console.log("To:", recipient);
    
    const tx = await sender.sendTransaction({
      to: recipient,
      value: ethers.parseEther("100"),
    });
    
    await tx.wait();
    
    console.log("✅ Successfully sent 100 ETH!");
    console.log("Transaction hash:", tx.hash);
    
    // Check balance
    const balance = await ethers.provider.getBalance(recipient);
    console.log("New balance:", ethers.formatEther(balance), "ETH");
    
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
