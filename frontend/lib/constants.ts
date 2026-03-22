export const VAULT_FACTORY_ADDRESS = "0x8374257da04F00ABAf74E13EFE5A17B0f08EC226" as `0x${string}`;
export const VULT_HOOK_ADDRESS = "0xe988b6816d94C10377779F08f2ab08925cE96D09" as `0x${string}`;
export const BASE_POOL_MANAGER = "0x498581Ff718922c3f8e6A2444956aF099B2652b2" as `0x${string}`;

// Token addresses on Base Mainnet
export const WETH_ADDRESS = "0x4200000000000000000000000000000000000006" as `0x${string}`;
export const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`;
export const DAI_ADDRESS  = "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as `0x${string}`;
export const USDT_ADDRESS = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" as `0x${string}`;

// Chainlink Price Feeds on Base Mainnet
export const PRICE_FEEDS = {
  ETH_USD: "0x71041dddad3595F745215C98a901844ED99Db595" as `0x${string}`,
  USDC_USD: "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B" as `0x${string}`,
  USDT_USD: "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9" as `0x${string}`,
};

// Token metadata for display
export const TOKEN_META: Record<string, { symbol: string; decimals: number; name: string }> = {
  [WETH_ADDRESS.toLowerCase()]: { symbol: "WETH", decimals: 18, name: "Wrapped Ether" },
  [USDC_ADDRESS.toLowerCase()]: { symbol: "USDC", decimals: 6, name: "USD Coin" },
  [USDT_ADDRESS.toLowerCase()]: { symbol: "USDT", decimals: 6, name: "Tether USD" },
  [DAI_ADDRESS.toLowerCase()]:  { symbol: "DAI",  decimals: 18, name: "Dai Stablecoin" },
};

// AI Backend
export const AI_BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND_URL || "http://localhost:8000";
