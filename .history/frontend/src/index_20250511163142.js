// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThirdwebProvider, walletConnect } from "@thirdweb-dev/react";
import { WalletProvider } from './context/WalletProvider';
import { baseSepolia } from "@thirdweb-dev/chains";

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <ThirdwebProvider
      activeChain={baseSepolia}
      supportedWallets={[
        walletConnect({
          projectId: "7f8c19e1d729d08da2b1a29179a940aa", // Replace with your actual WC project ID
        }),
      ]}
    >
      <WalletProvider>
        <App />
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>
);

