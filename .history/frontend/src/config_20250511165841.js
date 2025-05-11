import { defineChain } from 'viem';

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

// Deployed contract address on Base Sepolia Testnet
export const COINFLIP_CONTRACT_ADDRESS = "0x01CE40BA4b295458dB7c6048115dB3a954f3E209"; // Update if deployed elsewhere