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

  describe("Compound Integration", function () {
    let mockCToken: any;
    let vaultFactory: any;
    const depositAmount = ethers.parseEther("1000");

    beforeEach(async function () {
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
        expect(await vault.getCompoundBalance()).to.equal(expectedBalance);
      });

      it("Should handle yield accrual", async function () {
        const deployAmount = ethers.parseEther("500");
        await vault.connect(owner).deployToCompound(deployAmount);
        
        // Simulate 5% interest accrual
        await mockCToken.accrueInterest(500); // 500 basis points = 5%
        
        const compoundBalance = await vault.getCompoundBalance();
        expect(compoundBalance).to.be.gt(deployAmount); // Should be higher due to interest
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

        expect(await newVault.getCompoundBalance()).to.equal(0);
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
        
        expect(await vault.getCompoundBalance()).to.equal(deployAmount);
        expect(await vault.totalAssets()).to.equal(depositAmount + newDepositAmount);
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
        
        // User2 should get fewer shares due to increased vault value from yield
        const sharesReceived = sharesAfter - sharesBefore;
        expect(sharesReceived).to.be.lt(newDepositAmount);
      });
    });
  });
});
