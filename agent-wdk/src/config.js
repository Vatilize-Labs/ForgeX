import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3100"),
  rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
  agentPrivateKey: process.env.AGENT_PRIVATE_KEY || "",
  chainId: 8453,

  // Contract addresses
  vaultFactory: process.env.VAULT_FACTORY_ADDRESS || "0x8374257da04F00ABAf74E13EFE5A17B0f08EC226",
  vultHook: process.env.VULT_HOOK_ADDRESS || "0xe988b6816d94C10377779F08f2ab08925cE96D09",

  // Token addresses on Base
  tokens: {
    USDT: process.env.USDT_ADDRESS || "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
};
