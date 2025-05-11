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
          projectId: "YOUR_WALLETCONNECT_PROJECT_ID", // Replace with your actual WC project ID
        }),
      ]}
    >
      <WalletProvider>
        <App />
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>
);

