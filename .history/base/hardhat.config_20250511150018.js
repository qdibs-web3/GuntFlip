require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config(); // To load environment variables for private key and API key

const BASE_TESTNET_RPC_URL = process.env.BASE_TESTNET_RPC_URL || "https://api.testnet.abs.xyz";
const BASE_TESTNET_PRIVATE_KEY = process.env.BASE_TESTNET_PRIVATE_KEY || "your_private_key_here"; // Placeholder
const BASE_API_KEY = process.env.BASE_API_KEY || "your_abscan_api_key_here"; // Placeholder

/** @type import("hardhat/config").HardhatUserConfig */
module.exports = {
  solidity: "0.8.24", // Match the pragma in your CoinFlipETH.sol
  networks: {
    Base_Sepolia: {
      url: BASE_TESTNET_RPC_URL,
      accounts: BASE_TESTNET_PRIVATE_KEY !== "your_private_key_here" ? [BASE_TESTNET_PRIVATE_KEY] : [],
      chainId: 84532, // As used previously
    },
  },
  etherscan: {
    // In Hardhat, the "etherscan" block is used for Etherscan-like explorers.
    // You need to provide the API URL for Abscan and your API key.
    apiKey: {
      Base_Sepolia: BASE_API_KEY,
      // As a fallback, some explorers might use a generic key or one of the mainnet names
    },
    customChains: [
      {
        network: "Base Sepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.abscan.org/api", // Assuming this is the API URL for Abscan verification
          browserURL: "https://sepolia.base.org" // The browser URL for Abscan
        }
      }
    ]
  },
  sourcify: {
    // Disabled by default
    // Enabled: false
  }
};

