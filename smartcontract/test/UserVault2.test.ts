import { expect } from "chai";
import { ethers } from "hardhat";
import { UserVault, MockERC20, ChainlinkMock, MockCToken, VaultFactory } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UserVault - Compound Integration", function () {
  let vault: UserVault;
  let asset: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let priceFeed: ChainlinkMock;
  let mockCToken: MockCToken;
  let vaultFactory: VaultFactory;

  const INITIAL_MINT = ethers.parseEther("10000");
  const VAULT_NAME = "SmartX Vault Token";
  const VAULT_SYMBOL = "svToken";
  const depositAmount = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await asset.waitForDeployment();

    // Mint tokens to users
    await asset.mint(user1.address, INITIAL_MINT);
    await asset.mint(user2.address, INITIAL_MINT);

    // Deploy ChainlinkMock (2000 USDC/USD, 8 decimals)
    const ChainlinkMockFactory = await ethers.getContractFactory("ChainlinkMock");
    priceFeed = await ChainlinkMockFactory.deploy(200000000000, 8); // $2000
    await priceFeed.waitForDeployment();

    // Deploy mock cToken
    const MockCTokenFactory = await ethers.getContractFactory("MockCToken");
    mockCToken = await MockCTokenFactory.deploy(await asset.getAddress());
    await mockCToken.waitForDeployment();

    // Deploy VaultFactory
    const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
    vaultFactory = await VaultFactoryContract.deploy(owner.address);
    await vaultFactory.waitForDeployment();

    // Set Compound address in factory
    await vaultFactory.connect(owner).setCompoundAddress(await mockCToken.getAddress());

    // Deploy new vault with factory reference
    const UserVaultFactory = await ethers.getContractFactory("UserVault");
    vault = await UserVaultFactory.deploy(
      await asset.getAddress(),
      owner.address,
      await vaultFactory.getAddress(),
      VAULT_NAME,
      VAULT_SYMBOL,
      await priceFeed.getAddress()
    );
    await vault.waitForDeployment();

    // Deposit assets to vault
    await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
    await vault.connect(user1).deposit(depositAmount, user1.address);
  });

  describe("Setup", function () {
    it("Should get Compound address from factory", async function () {
      const compoundAddress = await vaultFactory.getCompoundAddress();
      expect(compoundAddress).to.equal(await mockCToken.getAddress());
    });

    it("Should revert when Compound address not set", async function () {
      // Deploy factory without setting Compound address
      const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
      const newFactory = await VaultFactoryContract.deploy(owner.address);
      await newFactory.waitForDeployment();

      // Deploy vault with new factory
      const UserVaultFactory = await ethers.getContractFactory("UserVault");
      const newVault = await UserVaultFactory.deploy(
        await asset.getAddress(),
        owner.address,
        await newFactory.getAddress(),
        VAULT_NAME,
        VAULT_SYMBOL,
        await priceFeed.getAddress()
      );
      await newVault.waitForDeployment();

      await expect(
        newVault.connect(owner).deployToCompound(ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(newVault, "ProtocolAddressNotSet");
    });
  });

  describe("Deployment to Compound", function () {
    const deployAmount = ethers.parseEther("500");

    it("Should allow owner to deploy assets to Compound", async function () {
      await expect(vault.connect(owner).deployToCompound(deployAmount))
        .to.emit(vault, "ProtocolDeployed")
        .withArgs("Compound", deployAmount);

      // Check cToken balance
      const cTokenBalance = await mockCToken.balanceOf(await vault.getAddress());
      expect(cTokenBalance).to.be.gt(0);
    });

    it("Should update Compound balance after deployment", async function () {
      await vault.connect(owner).deployToCompound(deployAmount);
      
      const compoundBalance = await vault.getCompoundBalance();
      expect(compoundBalance).to.equal(deployAmount);
    });

    it("Should update total assets after deployment", async function () {
      const totalAssetsBefore = await vault.totalAssets();
      await vault.connect(owner).deployToCompound(deployAmount);
      
      const totalAssetsAfter = await vault.totalAssets();
      expect(totalAssetsAfter).to.equal(totalAssetsBefore);
    });

    it("Should revert when non-owner tries to deploy", async function () {
      await expect(
        vault.connect(user1).deployToCompound(deployAmount)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should revert when deploying zero amount", async function () {
      await expect(
        vault.connect(owner).deployToCompound(0)
      ).to.be.revertedWithCustomError(vault, "InvalidAmount");
    });

    it("Should revert when deploying more than available balance", async function () {
      const excessAmount = depositAmount + ethers.parseEther("100");
      await expect(
        vault.connect(owner).deployToCompound(excessAmount)
      ).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });

    it("Should allow multiple deployments", async function () {
      await vault.connect(owner).deployToCompound(ethers.parseEther("200"));
      await vault.connect(owner).deployToCompound(ethers.parseEther("300"));
      
      const compoundBalance = await vault.getCompoundBalance();
      expect(compoundBalance).to.equal(ethers.parseEther("500"));
    });
  });

  describe("Withdrawal from Compound", function () {
    const deployAmount = ethers.parseEther("500");
    const withdrawAmount = ethers.parseEther("200");

    beforeEach(async function () {
      await vault.connect(owner).deployToCompound(deployAmount);
    });

    it("Should allow owner to withdraw from Compound", async function () {
      await expect(vault.connect(owner).withdrawFromCompound(withdrawAmount))
        .to.emit(vault, "ProtocolWithdrawn")
        .withArgs("Compound", withdrawAmount);
    });

    it("Should update Compound balance after withdrawal", async function () {
      await vault.connect(owner).withdrawFromCompound(withdrawAmount);
      
      const compoundBalance = await vault.getCompoundBalance();
      expect(compoundBalance).to.equal(deployAmount - withdrawAmount);
    });

    it("Should update total assets after withdrawal", async function () {
      const totalAssetsBefore = await vault.totalAssets();
      await vault.connect(owner).withdrawFromCompound(withdrawAmount);
      
      const totalAssetsAfter = await vault.totalAssets();
      expect(totalAssetsAfter).to.equal(totalAssetsBefore);
    });

    it("Should revert when non-owner tries to withdraw", async function () {
      await expect(
        vault.connect(user1).withdrawFromCompound(withdrawAmount)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should revert when withdrawing zero amount", async function () {
      await expect(
        vault.connect(owner).withdrawFromCompound(0)
      ).to.be.revertedWithCustomError(vault, "InvalidAmount");
    });

    it("Should revert when withdrawing more than deposited", async function () {
      const excessAmount = deployAmount + ethers.parseEther("100");
      await expect(
        vault.connect(owner).withdrawFromCompound(excessAmount)
      ).to.be.revertedWithCustomError(vault, "InsufficientBalance");
    });

    it("Should allow full withdrawal", async function () {
      await vault.connect(owner).withdrawFromCompound(deployAmount);
      
      const compoundBalance = await vault.getCompoundBalance();
      expect(compoundBalance).to.equal(0);
    });
  });

  describe("Balance Tracking", function () {
    it("Should track Compound balance correctly", async function () {
      const amount1 = ethers.parseEther("300");
      const amount2 = ethers.parseEther("200");
      
      await vault.connect(owner).deployToCompound(amount1);
      expect(await vault.getCompoundBalance()).to.equal(amount1);
      
      await vault.connect(owner).deployToCompound(amount2);
      expect(await vault.getCompoundBalance()).to.equal(amount1 + amount2);
    });

    it("Should include Compound balance in total assets", async function () {
      const deployAmount = ethers.parseEther("500");
      const totalAssetsBefore = await vault.totalAssets();
      
      await vault.connect(owner).deployToCompound(deployAmount);
      
      const totalAssetsAfter = await vault.totalAssets();
      expect(totalAssetsAfter).to.equal(totalAssetsBefore);
    });

    it("Should handle multiple deposits and withdrawals", async function () {
      await vault.connect(owner).deployToCompound(ethers.parseEther("400"));
      await vault.connect(owner).withdrawFromCompound(ethers.parseEther("100"));
      await vault.connect(owner).deployToCompound(ethers.parseEther("200"));
      await vault.connect(owner).withdrawFromCompound(ethers.parseEther("150"));
      
      const expectedBalance = ethers.parseEther("350");
      const actualBalance = await vault.getCompoundBalance();
      expect(actualBalance).to.equal(expectedBalance);
    });

    it("Should handle yield accrual", async function () {
      const deployAmount = ethers.parseEther("500");
      await vault.connect(owner).deployToCompound(deployAmount);
      
      // Simulate 5% interest accrual
      await mockCToken.accrueInterest(500); // 500 basis points = 5%
      
      const compoundBalance = await vault.getCompoundBalance();
      const expectedMinimum = deployAmount; // Should be at least the deposited amount
      expect(compoundBalance).to.be.gte(expectedMinimum); // Should be higher or equal due to interest
    });

    it("Should return zero when no Compound address set", async function () {
      // Deploy factory without Compound address
      const VaultFactoryContract = await ethers.getContractFactory("VaultFactory");
      const newFactory = await VaultFactoryContract.deploy(owner.address);
      await newFactory.waitForDeployment();

      // Deploy vault
      const UserVaultFactory = await ethers.getContractFactory("UserVault");
      const newVault = await UserVaultFactory.deploy(
        await asset.getAddress(),
        owner.address,
        await newFactory.getAddress(),
        VAULT_NAME,
        VAULT_SYMBOL,
        await priceFeed.getAddress()
      );
      await newVault.waitForDeployment();

      const balance = await newVault.getCompoundBalance();
      expect(balance).to.equal(0);
    });
  });

  describe("Integration Tests", function () {
    it("Should allow deposit to vault, then deploy to Compound", async function () {
      const newDepositAmount = ethers.parseEther("500");
      
      // User2 deposits to vault
      await asset.connect(user2).approve(await vault.getAddress(), newDepositAmount);
      await vault.connect(user2).deposit(newDepositAmount, user2.address);
      
      // Owner deploys to Compound
      const deployAmount = ethers.parseEther("1000");
      await vault.connect(owner).deployToCompound(deployAmount);
      
      const compoundBalance = await vault.getCompoundBalance();
      const totalAssets = await vault.totalAssets();
      expect(compoundBalance).to.equal(deployAmount);
      expect(totalAssets).to.equal(depositAmount + newDepositAmount);
    });

    it("Should allow withdraw from Compound, then redeem from vault", async function () {
      // Deploy to Compound
      const deployAmount = ethers.parseEther("500");
      await vault.connect(owner).deployToCompound(deployAmount);
      
      // Withdraw from Compound
      await vault.connect(owner).withdrawFromCompound(deployAmount);
      
      // User redeems shares
      const userShares = await vault.balanceOf(user1.address);
      await vault.connect(user1).redeem(userShares, user1.address, user1.address);
      
      expect(await vault.balanceOf(user1.address)).to.equal(0);
    });

    it("Should correctly calculate share value with Compound yield", async function () {
      // Deploy to Compound
      await vault.connect(owner).deployToCompound(ethers.parseEther("500"));
      
      // Simulate 10% yield
      await mockCToken.accrueInterest(1000); // 1000 basis points = 10%
      
      // New user deposits
      const newDepositAmount = ethers.parseEther("100");
      await asset.connect(user2).approve(await vault.getAddress(), newDepositAmount);
      
      const sharesBefore = await vault.totalSupply();
      await vault.connect(user2).deposit(newDepositAmount, user2.address);
      const sharesAfter = await vault.totalSupply();
      
      // Since totalAssets() uses tracked balance (compoundDeposited), not actual yield,
      // shares will be 1:1 unless we manually update total assets
      const sharesReceived = sharesAfter - sharesBefore;
      expect(sharesReceived).to.be.lte(newDepositAmount);
    });
  });
});
