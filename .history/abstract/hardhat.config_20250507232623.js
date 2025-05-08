require("@nomicfoundation/hardhat-toolbox") ;
require("dotenv").config(); // Add this line to load .env variables
require("@nomicfoundation/hardhat-verify"); // <--- Add this line


/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20", // Or your specific Solidity version
  networks: {
    hardhat: {
      // Default Hardhat local network
    },
    abstractTestnet: {
      url: process.env.ABSTRACT_TESTNET_RPC_URL || "https://api.testnet.abs.xyz",
      chainId: 11124,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      // You can also add gasPrice or other network-specific configurations here if needed
    }
  },
  etherscan: {
    apiKey: {
      abstractTestnet: "YOUR_ABSCAN_API_KEY_IF_NEEDED" // Replace if Abstract has an Etherscan-like explorer with API keys
  },
  customChains: [
    {
      network: "abstractTestnet",
      chainId: 11124,
      urls: {
      apiURL: "https://api-sepolia.abscan.org/api", // e.g., https://api-sepolia.abscan.org/api
      browserURL: "https://sepolia.abscan.org" // e.g., https://sepolia.abscan.org
    }
    }
    ]
  }
};

