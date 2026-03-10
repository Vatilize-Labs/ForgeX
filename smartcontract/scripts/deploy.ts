import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying contracts with the account:", deployerAddress);

  const factoryAddressEnv = process.env.FACTORY_ADDRESS;
  let factoryAddress = factoryAddressEnv;

  if (!factoryAddressEnv) {
    // 1. Deploy VaultFactory
    console.log("Deploying VaultFactory...");
    const VaultFactory = await ethers.getContractFactory("VaultFactory");
    const vaultFactory = await VaultFactory.deploy(deployerAddress);
    await vaultFactory.waitForDeployment();
    factoryAddress = await vaultFactory.getAddress();
    console.log("VaultFactory deployed to:", factoryAddress);
  } else {
    console.log("VaultFactory already deployed at:", factoryAddress);
  }

  // 2. Deploy VultHook
  const poolManagerAddress = (process.env.POOL_MANAGER_ADDRESS || "0x498581ff718922c3f8e6a2444956af099b2652b2").toLowerCase();
  
  // Ensure poolManagerAddress is a valid address string, not an object
  const validPoolManagerAddress = ethers.getAddress(poolManagerAddress);
  console.log("Deploying VultHook with PoolManager:", validPoolManagerAddress);
  
  const VultHook = await ethers.getContractFactory("VultHook");
  const vultHook = await VultHook.deploy(validPoolManagerAddress);
  await vultHook.waitForDeployment();
  const hookAddress = await vultHook.getAddress();
  console.log("VultHook deployed to:", hookAddress);

  console.log("\nWait for a few blocks for explorer to index...");
  
  // Verification details
  console.log("\nRun the following commands to verify:");
  console.log(`npx hardhat verify --network base ${factoryAddress} "${deployerAddress}"`);
  console.log(`npx hardhat verify --network base ${hookAddress} "${validPoolManagerAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
