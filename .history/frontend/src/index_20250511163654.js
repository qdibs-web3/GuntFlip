// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThirdwebProvider, walletConnect } from "@thirdweb-dev/react";
import { WalletProvider } from './context/WalletProvider';
import { defineChain } from "thirdweb/chains";

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

// Define Base Sepolia chain
const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: {
    name: "Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://84532.rpc.thirdweb.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "Base Sepolia Explorer",
      url: "https://base-sepolia.blockscout.com",
    },
  },
  testnet: true,
});

root.render(
  <React.StrictMode>
    <ThirdwebProvider
      activeChain={baseSepolia}
      supportedWallets={[
        walletConnect({
          projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Replace with your actual WalletConnect project ID
        }),
      ]}
    >
      <WalletProvider>
        <App />
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>
);
