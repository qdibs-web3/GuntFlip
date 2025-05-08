// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AbstractWalletProvider } from '@abstract-foundation/agw-react';
import { WalletProvider } from './context/WalletProvider';
import { abstractTestnet, abstract } from "viem/chains";

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <AbstractWalletProvider chain={abstractTestnet}>
      <WalletProvider>
        <App />
      </WalletProvider>
    </AbstractWalletProvider>
  </React.StrictMode>
);
