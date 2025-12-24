import { expect } from "chai";
import { ethers } from "hardhat";
import { UserVault, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UserVault", function () {
  let vault: UserVault;
  let asset: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let factory: SignerWithAddress;

  const INITIAL_MINT = ethers.parseEther("10000");
  const VAULT_NAME = "SmartX Vault Token";
  const VAULT_SYMBOL = "svToken";

  beforeEach(async function () {
    [owner, user1, user2, factory] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    asset = await MockERC20Factory.deploy("Mock USDC", "USDC", 6);
    await asset.waitForDeployment();

    // Mint tokens to users
    await asset.mint(user1.address, INITIAL_MINT);
    await asset.mint(user2.address, INITIAL_MINT);

    // Deploy UserVault
    const UserVaultFactory = await ethers.getContractFactory("UserVault");
    vault = await UserVaultFactory.deploy(
      await asset.getAddress(),
      owner.address,
      factory.address,
      VAULT_NAME,
      VAULT_SYMBOL
    );
    await vault.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct asset", async function () {
      expect(await vault.asset()).to.equal(await asset.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should set the correct factory", async function () {
      expect(await vault.factory()).to.equal(factory.address);
    });

    it("Should set the correct name and symbol", async function () {
      expect(await vault.name()).to.equal(VAULT_NAME);
      expect(await vault.symbol()).to.equal(VAULT_SYMBOL);
    });

    it("Should have zero total assets initially", async function () {
      expect(await vault.totalAssets()).to.equal(0);
    });

    it("Should have zero total supply initially", async function () {
      expect(await vault.totalSupply()).to.equal(0);
    });

    it("Should revert if asset is zero address", async function () {
      const UserVaultFactory = await ethers.getContractFactory("UserVault");
      await expect(
        UserVaultFactory.deploy(
          ethers.ZeroAddress,
          owner.address,
          factory.address,
          VAULT_NAME,
          VAULT_SYMBOL
        )
      ).to.be.revertedWith("UserVault: asset is zero address");
    });

    it("Should revert if factory is zero address", async function () {
      const UserVaultFactory = await ethers.getContractFactory("UserVault");
      await expect(
        UserVaultFactory.deploy(
          await asset.getAddress(),
          owner.address,
          ethers.ZeroAddress,
          VAULT_NAME,
          VAULT_SYMBOL
        )
      ).to.be.revertedWith("UserVault: factory is zero address");
    });
  });

  describe("Deposit", function () {
    const depositAmount = ethers.parseEther("1000");

    it("Should allow first deposit with 1:1 ratio", async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      
      await expect(vault.connect(user1).deposit(depositAmount, user1.address))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user1.address, depositAmount, depositAmount);

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount);
      expect(await vault.totalAssets()).to.equal(depositAmount);
      expect(await vault.totalSupply()).to.equal(depositAmount);
    });

    it("Should allow subsequent deposits with proportional shares", async function () {
      // First deposit
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Second deposit
      await asset.connect(user2).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user2).deposit(depositAmount, user2.address);

      expect(await vault.balanceOf(user2.address)).to.equal(depositAmount);
      expect(await vault.totalAssets()).to.equal(depositAmount * 2n);
      expect(await vault.totalSupply()).to.equal(depositAmount * 2n);
    });

    it("Should allow deposit to different receiver", async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user2.address);

      expect(await vault.balanceOf(user1.address)).to.equal(0);
      expect(await vault.balanceOf(user2.address)).to.equal(depositAmount);
    });

    it("Should revert on zero deposit", async function () {
      await expect(
        vault.connect(user1).deposit(0, user1.address)
      ).to.be.revertedWith("UserVault: cannot deposit 0");
    });

    it("Should revert if receiver is zero address", async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await expect(
        vault.connect(user1).deposit(depositAmount, ethers.ZeroAddress)
      ).to.be.revertedWith("UserVault: receiver is zero address");
    });

    it("Should handle deposits with yield (increased asset value)", async function () {
      // First deposit
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Simulate yield by minting more assets to vault
      const yieldAmount = ethers.parseEther("100");
      await asset.mint(await vault.getAddress(), yieldAmount);

      // Second deposit should get fewer shares due to increased asset value
      await asset.connect(user2).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user2).deposit(depositAmount, user2.address);

      const user2Shares = await vault.balanceOf(user2.address);
      expect(user2Shares).to.be.lt(depositAmount); // Less than 1:1 ratio
    });
  });

  describe("Mint", function () {
    const mintShares = ethers.parseEther("1000");

    it("Should allow minting shares", async function () {
      const assetsNeeded = await vault.previewMint(mintShares);
      await asset.connect(user1).approve(await vault.getAddress(), assetsNeeded);
      
      await expect(vault.connect(user1).mint(mintShares, user1.address))
        .to.emit(vault, "Deposit")
        .withArgs(user1.address, user1.address, assetsNeeded, mintShares);

      expect(await vault.balanceOf(user1.address)).to.equal(mintShares);
    });

    it("Should revert on zero mint", async function () {
      await expect(
        vault.connect(user1).mint(0, user1.address)
      ).to.be.revertedWith("UserVault: cannot mint 0");
    });

    it("Should revert if receiver is zero address", async function () {
      await expect(
        vault.connect(user1).mint(mintShares, ethers.ZeroAddress)
      ).to.be.revertedWith("UserVault: receiver is zero address");
    });
  });

  describe("Withdraw", function () {
    const depositAmount = ethers.parseEther("1000");
    const withdrawAmount = ethers.parseEther("500");

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should allow withdrawal", async function () {
      const sharesBefore = await vault.balanceOf(user1.address);
      const assetsBefore = await asset.balanceOf(user1.address);

      await expect(vault.connect(user1).withdraw(withdrawAmount, user1.address, user1.address))
        .to.emit(vault, "Withdraw");

      expect(await vault.balanceOf(user1.address)).to.be.lt(sharesBefore);
      expect(await asset.balanceOf(user1.address)).to.equal(assetsBefore + withdrawAmount);
    });

    it("Should allow withdrawal to different receiver", async function () {
      await vault.connect(user1).withdraw(withdrawAmount, user2.address, user1.address);

      expect(await asset.balanceOf(user2.address)).to.equal(INITIAL_MINT + withdrawAmount);
    });

    it("Should allow withdrawal with allowance", async function () {
      await vault.connect(user1).approve(user2.address, depositAmount);
      await vault.connect(user2).withdraw(withdrawAmount, user2.address, user1.address);

      expect(await asset.balanceOf(user2.address)).to.equal(INITIAL_MINT + withdrawAmount);
    });

    it("Should revert on zero withdrawal", async function () {
      await expect(
        vault.connect(user1).withdraw(0, user1.address, user1.address)
      ).to.be.revertedWith("UserVault: cannot withdraw 0");
    });

    it("Should revert if receiver is zero address", async function () {
      await expect(
        vault.connect(user1).withdraw(withdrawAmount, ethers.ZeroAddress, user1.address)
      ).to.be.revertedWith("UserVault: receiver is zero address");
    });

    it("Should revert if owner is zero address", async function () {
      await expect(
        vault.connect(user1).withdraw(withdrawAmount, user1.address, ethers.ZeroAddress)
      ).to.be.revertedWith("UserVault: owner is zero address");
    });

    it("Should revert on insufficient allowance", async function () {
      await expect(
        vault.connect(user2).withdraw(withdrawAmount, user2.address, user1.address)
      ).to.be.revertedWith("UserVault: insufficient allowance");
    });
  });

  describe("Redeem", function () {
    const depositAmount = ethers.parseEther("1000");
    const redeemShares = ethers.parseEther("500");

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should allow redeeming shares", async function () {
      const assetsBefore = await asset.balanceOf(user1.address);
      const assetsReceived = await vault.previewRedeem(redeemShares);

      await expect(vault.connect(user1).redeem(redeemShares, user1.address, user1.address))
        .to.emit(vault, "Withdraw");

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount - redeemShares);
      expect(await asset.balanceOf(user1.address)).to.equal(assetsBefore + assetsReceived);
    });

    it("Should allow redeeming to different receiver", async function () {
      await vault.connect(user1).redeem(redeemShares, user2.address, user1.address);

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount - redeemShares);
    });

    it("Should allow redeeming with allowance", async function () {
      await vault.connect(user1).approve(user2.address, redeemShares);
      await vault.connect(user2).redeem(redeemShares, user2.address, user1.address);

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount - redeemShares);
    });

    it("Should revert on zero redeem", async function () {
      await expect(
        vault.connect(user1).redeem(0, user1.address, user1.address)
      ).to.be.revertedWith("UserVault: cannot redeem 0");
    });

    it("Should revert on insufficient allowance", async function () {
      await expect(
        vault.connect(user2).redeem(redeemShares, user2.address, user1.address)
      ).to.be.revertedWith("UserVault: insufficient allowance");
    });
  });

  describe("Conversion Functions", function () {
    const depositAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should convert assets to shares correctly", async function () {
      const shares = await vault.convertToShares(depositAmount);
      expect(shares).to.equal(depositAmount); // 1:1 ratio when no yield
    });

    it("Should convert shares to assets correctly", async function () {
      const assets = await vault.convertToAssets(depositAmount);
      expect(assets).to.equal(depositAmount); // 1:1 ratio when no yield
    });

    it("Should handle conversions with yield", async function () {
      // Add yield
      const yieldAmount = ethers.parseEther("100");
      await asset.mint(await vault.getAddress(), yieldAmount);

      const shares = await vault.convertToShares(depositAmount);
      expect(shares).to.be.lt(depositAmount); // Less shares due to increased value

      const assets = await vault.convertToAssets(depositAmount);
      expect(assets).to.be.gt(depositAmount); // More assets per share
    });
  });

  describe("Preview Functions", function () {
    const depositAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should preview deposit correctly", async function () {
      const shares = await vault.previewDeposit(depositAmount);
      expect(shares).to.equal(depositAmount);
    });

    it("Should preview mint correctly", async function () {
      const assets = await vault.previewMint(depositAmount);
      expect(assets).to.equal(depositAmount);
    });

    it("Should preview withdraw correctly", async function () {
      const shares = await vault.previewWithdraw(depositAmount);
      expect(shares).to.equal(depositAmount);
    });

    it("Should preview redeem correctly", async function () {
      const assets = await vault.previewRedeem(depositAmount);
      expect(assets).to.equal(depositAmount);
    });
  });

  describe("Max Functions", function () {
    const depositAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should return max deposit", async function () {
      expect(await vault.maxDeposit(user1.address)).to.equal(ethers.MaxUint256);
    });

    it("Should return max mint", async function () {
      expect(await vault.maxMint(user1.address)).to.equal(ethers.MaxUint256);
    });

    it("Should return max withdraw", async function () {
      const maxWithdraw = await vault.maxWithdraw(user1.address);
      expect(maxWithdraw).to.equal(depositAmount);
    });

    it("Should return max redeem", async function () {
      const maxRedeem = await vault.maxRedeem(user1.address);
      expect(maxRedeem).to.equal(depositAmount);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple users depositing and withdrawing", async function () {
      const amount1 = ethers.parseEther("1000");
      const amount2 = ethers.parseEther("2000");

      // User1 deposits
      await asset.connect(user1).approve(await vault.getAddress(), amount1);
      await vault.connect(user1).deposit(amount1, user1.address);

      // User2 deposits
      await asset.connect(user2).approve(await vault.getAddress(), amount2);
      await vault.connect(user2).deposit(amount2, user2.address);

      expect(await vault.totalAssets()).to.equal(amount1 + amount2);

      // User1 withdraws
      await vault.connect(user1).redeem(amount1, user1.address, user1.address);
      expect(await vault.balanceOf(user1.address)).to.equal(0);

      // User2 still has shares
      expect(await vault.balanceOf(user2.address)).to.equal(amount2);
    });

    it("Should handle share transfers", async function () {
      const depositAmount = ethers.parseEther("1000");
      
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);

      // Transfer shares
      await vault.connect(user1).transfer(user2.address, depositAmount / 2n);

      expect(await vault.balanceOf(user1.address)).to.equal(depositAmount / 2n);
      expect(await vault.balanceOf(user2.address)).to.equal(depositAmount / 2n);

      // User2 can redeem transferred shares
      await vault.connect(user2).redeem(depositAmount / 2n, user2.address, user2.address);
      expect(await vault.balanceOf(user2.address)).to.equal(0);
    });
  });
});
