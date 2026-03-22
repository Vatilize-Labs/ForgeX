export const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const VAULT_FACTORY_ABI = [
  "function getUserVaults(address user) view returns (address[])",
  "function isUserRegistered(address user) view returns (bool)",
  "function getTotalVaults() view returns (uint256)",
  "function getVaultOwner(address vault) view returns (address)",
  "function assetPriceFeeds(address asset) view returns (address)",
];

export const USER_VAULT_ABI = [
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function asset() view returns (address)",
  "function isPaused() view returns (bool)",
  "function getAaveBalance() view returns (uint256)",
  "function getCompoundBalance() view returns (uint256)",
  "function getTotalValueUSD() view returns (uint256)",
  "function getSharePriceUSD() view returns (uint256)",
  "function getAssetPriceUSD() view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function owner() view returns (address)",
  // Write functions for agent execution
  "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
  "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
  "function deployToAave(uint256 amount)",
  "function deployToCompound(uint256 amount)",
  "function withdrawFromAave(uint256 amount)",
  "function withdrawFromCompound(uint256 amount)",
];
