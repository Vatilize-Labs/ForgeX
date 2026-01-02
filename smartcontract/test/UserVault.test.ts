import { expect } from "chai";
import { ethers } from "hardhat";
import { UserVault, MockERC20, ChainlinkMock } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UserVault", function () {
  let vault: UserVault;
  let asset: MockERC20;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let factory: SignerWithAddress;
  let priceFeed: ChainlinkMock;

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

    // Deploy ChainlinkMock (2000 USDC/USD, 8 decimals)
    const ChainlinkMockFactory = await ethers.getContractFactory("ChainlinkMock");
    priceFeed = await ChainlinkMockFactory.deploy(200000000000, 8); // $2000
    await priceFeed.waitForDeployment();

    // Deploy UserVault
    const UserVaultFactory = await ethers.getContractFactory("UserVault");
    vault = await UserVaultFactory.deploy(
      await asset.getAddress(),
      owner.address,
      factory.address,
      VAULT_NAME,
      VAULT_SYMBOL,
      await priceFeed.getAddress()
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
          VAULT_SYMBOL,
          await priceFeed.getAddress()
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
          VAULT_SYMBOL,
          await priceFeed.getAddress()
        )
      ).to.be.revertedWith("UserVault: factory is zero address");
    });

    it("Should revert if price feed is zero address", async function () {
      const UserVaultFactory = await ethers.getContractFactory("UserVault");
      await expect(
        UserVaultFactory.deploy(
          await asset.getAddress(),
          owner.address,
          factory.address,
          VAULT_NAME,
          VAULT_SYMBOL,
          ethers.ZeroAddress
        )
      ).to.be.revertedWith("UserVault: price feed is zero address");
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


  describe("Price Feeds", function () {
    const depositAmount = ethers.parseEther("1.0"); // 1 ETH (or 1 Unit of Asset)

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should return correct asset price in USD", async function () {
      // Feed is $2000 (2000 * 1e8)
      // Expected result is 2000 * 1e18
      const expectedPrice = ethers.parseUnits("2000", 18);
      expect(await vault.getAssetPriceUSD()).to.equal(expectedPrice);
    });

    it("Should return correct total value in USD", async function () {
      // Total assets = 1.0 (1e18)
      // Price = $2000
      // Value = 2000 USD (2000 * 1e18)
      const expectedValue = ethers.parseUnits("2000", 18);
      expect(await vault.getTotalValueUSD()).to.equal(expectedValue);
    });

    it("Should return correct share price in USD", async function () {
      // 1 Share = 1 Asset (1:1 initially)
      // Share Price = $2000
      const expectedPrice = ethers.parseUnits("2000", 18);
      expect(await vault.getSharePriceUSD()).to.equal(expectedPrice);
    });

    it("Should update value when price feed updates", async function () {
      // Update price to $3000
      await priceFeed.setPrice(300000000000); // 3000 * 1e8

      const expectedValue = ethers.parseUnits("3000", 18);
      expect(await vault.getTotalValueUSD()).to.equal(expectedValue);
      expect(await vault.getSharePriceUSD()).to.equal(expectedValue);
    });
  });
  describe("Protocol Allocation Management", function () {
    const depositAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    it("Should allow owner to set protocol allocation", async function () {
      await expect(vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("500")))
        .to.emit(vault, "ProtocolAllocationChanged")
        .withArgs("Aave", 0, ethers.parseEther("500"));

      expect(await vault.getProtocolAllocation("Aave")).to.equal(ethers.parseEther("500"));
    });

    it("Should prevent non-owner from setting allocation", async function () {
      await expect(
        vault.connect(user1).setProtocolAllocation("Aave", ethers.parseEther("500"))
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should revert on empty protocol name", async function () {
      await expect(
        vault.connect(owner).setProtocolAllocation("", ethers.parseEther("500"))
      ).to.be.revertedWithCustomError(vault, "InvalidProtocolName");
    });

    it("Should revert when allocation exceeds balance", async function () {
      await expect(
        vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("2000"))
      ).to.be.revertedWithCustomError(vault, "AllocationExceedsBalance");
    });

    it("Should allow multiple protocol allocations", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("300"));
      await vault.connect(owner).setProtocolAllocation("Compound", ethers.parseEther("400"));
      await vault.connect(owner).setProtocolAllocation("Uniswap", ethers.parseEther("200"));

      expect(await vault.getProtocolAllocation("Aave")).to.equal(ethers.parseEther("300"));
      expect(await vault.getProtocolAllocation("Compound")).to.equal(ethers.parseEther("400"));
      expect(await vault.getProtocolAllocation("Uniswap")).to.equal(ethers.parseEther("200"));
    });

    it("Should calculate total allocated correctly", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("300"));
      await vault.connect(owner).setProtocolAllocation("Compound", ethers.parseEther("400"));

      expect(await vault.getTotalAllocated()).to.equal(ethers.parseEther("700"));
    });

    it("Should prevent total allocations from exceeding balance", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("600"));
      
      await expect(
        vault.connect(owner).setProtocolAllocation("Compound", ethers.parseEther("500"))
      ).to.be.revertedWithCustomError(vault, "AllocationExceedsBalance");
    });

    it("Should allow updating existing allocation", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("500"));
      
      await expect(vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("300")))
        .to.emit(vault, "ProtocolAllocationChanged")
        .withArgs("Aave", ethers.parseEther("500"), ethers.parseEther("300"));

      expect(await vault.getProtocolAllocation("Aave")).to.equal(ethers.parseEther("300"));
    });

    it("Should allow setting allocation to zero", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("500"));
      
      await expect(vault.connect(owner).setProtocolAllocation("Aave", 0))
        .to.emit(vault, "ProtocolAllocationChanged")
        .withArgs("Aave", ethers.parseEther("500"), 0);

      expect(await vault.getProtocolAllocation("Aave")).to.equal(0);
    });

    it("Should return all protocol allocations", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("300"));
      await vault.connect(owner).setProtocolAllocation("Compound", ethers.parseEther("400"));

      const [protocols, amounts] = await vault.getAllProtocolAllocations();
      
      expect(protocols.length).to.equal(2);
      expect(amounts.length).to.equal(2);
      expect(protocols).to.include("Aave");
      expect(protocols).to.include("Compound");
    });

    it("Should handle allocation removal from array", async function () {
      await vault.connect(owner).setProtocolAllocation("Aave", ethers.parseEther("300"));
      await vault.connect(owner).setProtocolAllocation("Compound", ethers.parseEther("400"));
      
      // Set Aave to 0 (should remove from array)
      await vault.connect(owner).setProtocolAllocation("Aave", 0);
      
      const [protocols, amounts] = await vault.getAllProtocolAllocations();
      expect(protocols.length).to.equal(1);
      expect(protocols[0]).to.equal("Compound");
    });

    it("Should return zero for unallocated protocol", async function () {
      expect(await vault.getProtocolAllocation("NonExistent")).to.equal(0);
    });
  });
  describe("Pause/Unpause Functionality", function () {
    const depositAmount = ethers.parseEther("1000");

    beforeEach(async function () {
      // User1 deposits some assets for testing
      await asset.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount, user1.address);
    });

    describe("Pause Operations", function () {
      it("Should allow owner to pause vault", async function () {
        await expect(vault.connect(owner).pause())
          .to.emit(vault, "VaultPaused")
          .withArgs(await vault.getAddress(), owner.address);

        expect(await vault.isPaused()).to.equal(true);
      });

      it("Should revert when non-owner tries to pause", async function () {
        await expect(
          vault.connect(user1).pause()
        ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });

      it("Should revert when pausing already paused vault", async function () {
        await vault.connect(owner).pause();
        
        await expect(
          vault.connect(owner).pause()
        ).to.be.revertedWithCustomError(vault, "EnforcedPause");
      });
    });

    describe("Unpause Operations", function () {
      beforeEach(async function () {
        await vault.connect(owner).pause();
      });

      it("Should allow owner to unpause vault", async function () {
        await expect(vault.connect(owner).unpause())
          .to.emit(vault, "VaultUnpaused")
          .withArgs(await vault.getAddress(), owner.address);

        expect(await vault.isPaused()).to.equal(false);
      });

      it("Should revert when non-owner tries to unpause", async function () {
        await expect(
          vault.connect(user1).unpause()
        ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
      });

      it("Should revert when unpausing already unpaused vault", async function () {
        await vault.connect(owner).unpause();
        
        await expect(
          vault.connect(owner).unpause()
        ).to.be.revertedWithCustomError(vault, "EnforcedPause");
      });
    });

    describe("Protected Functions When Paused", function () {
      beforeEach(async function () {
        await vault.connect(owner).pause();
      });

      it("Should revert deposit when paused", async function () {
        const amount = ethers.parseEther("100");
        await asset.connect(user2).approve(await vault.getAddress(), amount);

        await expect(
          vault.connect(user2).deposit(amount, user2.address)
        ).to.be.revertedWithCustomError(vault, "EnforcedPause");
      });

      it("Should revert withdraw when paused", async function () {
        const amount = ethers.parseEther("100");

        await expect(
          vault.connect(user1).withdraw(amount, user1.address, user1.address)
        ).to.be.revertedWithCustomError(vault, "EnforcedPause");
      });

      it("Should revert mint when paused", async function () {
        const shares = ethers.parseEther("100");
        await asset.connect(user2).approve(await vault.getAddress(), ethers.parseEther("1000"));

        await expect(
          vault.connect(user2).mint(shares, user2.address)
        ).to.be.revertedWithCustomError(vault, "EnforcedPause");
      });

      it("Should revert redeem when paused", async function () {
        const shares = ethers.parseEther("100");

        await expect(
          vault.connect(user1).redeem(shares, user1.address, user1.address)
        ).to.be.revertedWithCustomError(vault, "EnforcedPause");
      });
    });

    describe("View Functions When Paused", function () {
      beforeEach(async function () {
        await vault.connect(owner).pause();
      });

      it("Should allow totalAssets when paused", async function () {
        const totalAssets = await vault.totalAssets();
        expect(totalAssets).to.be.gt(0);
      });

      it("Should allow convertToShares when paused", async function () {
        const shares = await vault.convertToShares(ethers.parseEther("100"));
        expect(shares).to.be.gt(0);
      });

      it("Should allow convertToAssets when paused", async function () {
        const assets = await vault.convertToAssets(ethers.parseEther("100"));
        expect(assets).to.be.gt(0);
      });

      it("Should allow previewDeposit when paused", async function () {
        const shares = await vault.previewDeposit(ethers.parseEther("100"));
        expect(shares).to.be.gt(0);
      });

      it("Should allow balanceOf when paused", async function () {
        const balance = await vault.balanceOf(user1.address);
        expect(balance).to.be.gt(0);
      });

      it("Should allow isPaused when paused", async function () {
        const paused = await vault.isPaused();
        expect(paused).to.equal(true);
      });
    });

    describe("Integration Tests", function () {
      it("Should allow operations after unpause", async function () {
        // Pause vault
        await vault.connect(owner).pause();
        expect(await vault.isPaused()).to.equal(true);

        // Unpause vault
        await vault.connect(owner).unpause();
        expect(await vault.isPaused()).to.equal(false);

        // Should allow deposit after unpause
        const amount = ethers.parseEther("100");
        await asset.connect(user2).approve(await vault.getAddress(), amount);
        await expect(
          vault.connect(user2).deposit(amount, user2.address)
        ).to.not.be.reverted;
      });

      it("Should handle multiple pause/unpause cycles", async function () {
        // First cycle
        await vault.connect(owner).pause();
        expect(await vault.isPaused()).to.equal(true);
        await vault.connect(owner).unpause();
        expect(await vault.isPaused()).to.equal(false);

        // Second cycle
        await vault.connect(owner).pause();
        expect(await vault.isPaused()).to.equal(true);
        await vault.connect(owner).unpause();
        expect(await vault.isPaused()).to.equal(false);

        // Operations should work
        const amount = ethers.parseEther("50");
        await asset.connect(user2).approve(await vault.getAddress(), amount);
        await vault.connect(user2).deposit(amount, user2.address);
        expect(await vault.balanceOf(user2.address)).to.be.gt(0);
      });

      it("Should preserve state across pause/unpause", async function () {
        const balanceBefore = await vault.balanceOf(user1.address);
        const totalAssetsBefore = await vault.totalAssets();

        // Pause and unpause
        await vault.connect(owner).pause();
        await vault.connect(owner).unpause();

        // State should be preserved
        expect(await vault.balanceOf(user1.address)).to.equal(balanceBefore);
        expect(await vault.totalAssets()).to.equal(totalAssetsBefore);
      });
    });
  });
});
