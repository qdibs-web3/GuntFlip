import { defineChain } from 'viem';

// Deployed contract address on Base Sepolia Testnet
export const COINFLIP_CONTRACT_ADDRESS = "0x60E853B7d8A89841c93f67356F53dbc927868310"; // Update if deployed elsewhere

// Base Sepolia Testnet Chain Definition
export const baseSepoliaChain = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://sepolia.basescan.org' },
  },
  testnet: true,
});
