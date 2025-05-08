import { defineChain } from 'viem';

// Deployed contract addresses on Abstract Testnet
export const COINFLIP_CONTRACT_ADDRESS = "0x60E853B7d8A89841c93f67356F53dbc927868310"; // New CoinFlipETH address

// Abstract Testnet Chain Definition for Viem
export const abstractTestnetChain = defineChain({
  id: 11124, // Chain ID for Abstract Testnet
  name: 'Abstract Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Abstract Testnet Ether',
    symbol: 'ABS',
  },
  rpcUrls: {
    default: { http: [window.location.origin] }, // Using proxy for local dev
    public: { http: [window.location.origin] },  // Using proxy for local dev
  },
  blockExplorers: {
    default: { name: 'Abscan', url: 'https://sepolia.abscan.org' },
  },
  testnet: true,
});