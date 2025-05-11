// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { baseSepolia } from "@thirdweb-dev/chains";
import { WalletProvider } from './context/WalletProvider';

const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <ThirdwebProvider activeChain={baseSepolia}>
      <WalletProvider>
        <App />
      </WalletProvider>
    </ThirdwebProvider>
  </React.StrictMode>
);

);
