import { defineChain } from 'viem';

export const COINFLIP_CONTRACT_ADDRESS = '0x80bEA254a9d1BA5d717c4818667864D0C0FDF0Ae';
export const TOKEN_CONTRACT_ADDRESS = '0xec57694F014e9a273fE3e37B2072DbF574e4A1e7';

export const abstractTestnetChain = defineChain({
  id: 11124,
  name: 'Abstract Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, // Assuming ETH, adjust if Abstract uses a different native token symbol
  rpcUrls: {
    default: { http: ['https://api.testnet.abs.xyz'] },
    public: { http: ['https://api.testnet.abs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Abscan', url: 'https://sepolia.abscan.org' }, // Assuming Sepolia-based explorer
  },
  testnet: true,
});