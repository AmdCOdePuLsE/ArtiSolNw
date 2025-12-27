import * as dotenv from "dotenv";
import hardhatEthersPlugin from "@nomicfoundation/hardhat-ethers";
import { defineConfig } from "hardhat/config";

dotenv.config({ path: ".env.local" });

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "";
const privateKey = process.env.PRIVATE_KEY ?? "";
const etherscanApiKey = process.env.ETHERSCAN_API_KEY ?? "";

export default defineConfig({
  plugins: [hardhatEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.24",
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
    },
    ...(rpcUrl && privateKey
      ? {
          sepolia: {
            type: "http",
            chainType: "l1",
            url: rpcUrl,
            accounts: [privateKey],
          },
        }
      : {}),
  },
  etherscan: {
    apiKey: etherscanApiKey,
  },
});
