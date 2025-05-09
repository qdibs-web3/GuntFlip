require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config(); // To load environment variables for private key and API key

const ABSTRACT_TESTNET_RPC_URL = process.env.ABSTRACT_TESTNET_RPC_URL || "https://api.testnet.abs.xyz";
const ABSTRACT_TESTNET_PRIVATE_KEY = process.env.ABSTRACT_TESTNET_PRIVATE_KEY || "your_private_key_here"; // Placeholder
const ABSCAN_API_KEY = process.env.ABSCAN_API_KEY || "your_abscan_api_key_here"; // Placeholder

/** @type import("hardhat/config").HardhatUserConfig */
module.exports = {
  solidity: "0.8.24", // Match the pragma in your CoinFlipETH.sol
  networks: {
    abstractTestnet: {
      url: ABSTRACT_TESTNET_RPC_URL,
      accounts: ABSTRACT_TESTNET_PRIVATE_KEY !== "your_private_key_here" ? [ABSTRACT_TESTNET_PRIVATE_KEY] : [],
      chainId: 11124, // As used previously
    },
  },
  etherscan: {
    // In Hardhat, the "etherscan" block is used for Etherscan-like explorers.
    // You need to provide the API URL for Abscan and your API key.
    apiKey: {
      // If Abscan uses a network name different from how Hardhat expects it for custom chains,
      // you might need to use the network name you define in this config (e.g., "abstractTestnet")
      // or a generic one if Abscan doesn't require a specific network key here.
      // For custom chains, often you just need one entry that hardhat-verify will use.
      // Let's assume "abstractTestnet" is how hardhat-verify will identify it.
      abstractTestnet: ABSCAN_API_KEY,
      // As a fallback, some explorers might use a generic key or one of the mainnet names
      // mainnet: ABSCAN_API_KEY, // Uncomment if Abscan uses a generic key or mainnet key for all networks
    },
    customChains: [
      {
        network: "abstractTestnet",
        chainId: 11124,
        urls: {
          apiURL: "https://api-sepolia.abscan.org/api", // Assuming this is the API URL for Abscan verification
          browserURL: "https://sepolia.abscan.org" // The browser URL for Abscan
        }
      }
    ]
  },
  sourcify: {
    // Disabled by default
    // Enabled: false
  }
};

