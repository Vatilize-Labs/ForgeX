import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy VaultFactory
  console.log("Deploying VaultFactory...");
  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const vaultFactory = await VaultFactory.deploy(deployer.address);
  await vaultFactory.waitForDeployment();
  const factoryAddress = await vaultFactory.getAddress();
  console.log("VaultFactory deployed to:", factoryAddress);

  // 2. Deploy VultHook
  // Using a common PoolManager address for Uniswap v4 on Base Sepolia if not provided
  const poolManagerAddress = process.env.POOL_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000"; // Placeholder
  
  console.log("Deploying VultHook with PoolManager:", poolManagerAddress);
  const VultHook = await ethers.getContractFactory("VultHook");
  // The VultHook constructor takes IPoolManager
  const vultHook = await VultHook.deploy(poolManagerAddress);
  await vultHook.waitForDeployment();
  const hookAddress = await vultHook.getAddress();
  console.log("VultHook deployed to:", hookAddress);

  console.log("\nWait for a few blocks for explorer to index...");
  
  // Verification details
  console.log("\nRun the following commands to verify:");
  console.log(`npx hardhat verify --network baseSepolia ${factoryAddress} "${deployer.address}"`);
  console.log(`npx hardhat verify --network baseSepolia ${hookAddress} "${poolManagerAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
