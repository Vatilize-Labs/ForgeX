/**
 * WDK-powered Agent Wallet
 *
 * Self-custodial wallet for the autonomous DeFi agent.
 * Uses Tether WDK for wallet management and ethers.js for
 * Base Mainnet transaction execution.
 *
 * The agent wallet holds USDT as its base asset and executes
 * vault operations (deposit, withdraw, rebalance) autonomously.
 */

import { ethers } from "ethers";
import { config } from "./config.js";
import { ERC20_ABI, USER_VAULT_ABI, VAULT_FACTORY_ABI } from "./abis.js";

export class AgentWallet {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl, {
      chainId: config.chainId,
      name: "base",
    });

    if (!config.agentPrivateKey) {
      console.warn("[AgentWallet] No private key configured — read-only mode");
      this.signer = null;
    } else {
      this.signer = new ethers.Wallet(config.agentPrivateKey, this.provider);
    }

    this.factory = new ethers.Contract(
      config.vaultFactory,
      VAULT_FACTORY_ABI,
      this.signer || this.provider
    );
  }

  /** Get agent wallet address */
  getAddress() {
    return this.signer?.address || null;
  }

  /** Get ETH balance for gas */
  async getEthBalance() {
    if (!this.signer) return "0";
    const bal = await this.provider.getBalance(this.signer.address);
    return ethers.formatEther(bal);
  }

  /** Get USDT balance */
  async getUsdtBalance() {
    if (!this.signer) return "0";
    const usdt = new ethers.Contract(config.tokens.USDT, ERC20_ABI, this.provider);
    const bal = await usdt.balanceOf(this.signer.address);
    const decimals = await usdt.decimals();
    return ethers.formatUnits(bal, decimals);
  }

  /** Get token balance for any token */
  async getTokenBalance(tokenAddress) {
    if (!this.signer) return "0";
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const bal = await token.balanceOf(this.signer.address);
    const decimals = await token.decimals();
    return ethers.formatUnits(bal, decimals);
  }

  /** Get full wallet status */
  async getStatus() {
    const address = this.getAddress();
    if (!address) {
      return { connected: false, address: null, mode: "read-only" };
    }

    const [ethBalance, usdtBalance] = await Promise.all([
      this.getEthBalance(),
      this.getUsdtBalance(),
    ]);

    return {
      connected: true,
      address,
      mode: "active",
      chain: "Base Mainnet",
      chainId: config.chainId,
      balances: { ETH: ethBalance, USDT: usdtBalance },
    };
  }

  // ── Vault read operations ──

  /** Read vault data */
  async readVault(vaultAddress) {
    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.provider);

    const [
      totalAssets, totalSupply, asset, isPaused,
      aaveBalance, compoundBalance,
      totalValueUSD, sharePriceUSD, assetPriceUSD,
    ] = await Promise.all([
      vault.totalAssets().catch(() => 0n),
      vault.totalSupply().catch(() => 0n),
      vault.asset().catch(() => ethers.ZeroAddress),
      vault.isPaused().catch(() => false),
      vault.getAaveBalance().catch(() => 0n),
      vault.getCompoundBalance().catch(() => 0n),
      vault.getTotalValueUSD().catch(() => 0n),
      vault.getSharePriceUSD().catch(() => 0n),
      vault.getAssetPriceUSD().catch(() => 0n),
    ]);

    // Read actual asset decimals (e.g. 6 for USDT, 18 for WETH)
    let assetDecimals = 18;
    if (asset !== ethers.ZeroAddress) {
      try {
        const token = new ethers.Contract(asset, ERC20_ABI, this.provider);
        assetDecimals = Number(await token.decimals());
      } catch {}
    }

    const idle = totalAssets - aaveBalance - compoundBalance;

    return {
      address: vaultAddress,
      totalAssets: ethers.formatUnits(totalAssets, assetDecimals),
      totalSupply: ethers.formatUnits(totalSupply, assetDecimals),
      asset,
      isPaused,
      aaveBalance: ethers.formatUnits(aaveBalance, assetDecimals),
      compoundBalance: ethers.formatUnits(compoundBalance, assetDecimals),
      idleBalance: ethers.formatUnits(idle > 0n ? idle : 0n, assetDecimals),
      totalValueUSD: ethers.formatEther(totalValueUSD),
      sharePriceUSD: ethers.formatEther(sharePriceUSD),
      assetPriceUSD: ethers.formatEther(assetPriceUSD),
    };
  }

  /** Get all vaults for a user */
  async getUserVaults(userAddress) {
    const vaults = await this.factory.getUserVaults(userAddress);
    return vaults;
  }

  // ── Vault write operations (agent executes) ──

  /** Approve token spend for a vault */
  async approveToken(tokenAddress, spenderAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
    const decimals = await token.decimals();
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    const tx = await token.approve(spenderAddress, parsedAmount);
    return await tx.wait();
  }

  /** Deposit assets into a vault */
  async depositToVault(vaultAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.signer);
    const assetAddress = await vault.asset();

    // Approve vault to spend tokens
    const token = new ethers.Contract(assetAddress, ERC20_ABI, this.signer);
    const decimals = await token.decimals();
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    const approveTx = await token.approve(vaultAddress, parsedAmount);
    await approveTx.wait();

    // Deposit
    const tx = await vault.deposit(parsedAmount, this.signer.address);
    const receipt = await tx.wait();

    return {
      action: "deposit",
      vault: vaultAddress,
      amount: amount.toString(),
      txHash: receipt.hash,
    };
  }

  /** Withdraw assets from a vault */
  async withdrawFromVault(vaultAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.signer);
    const assetAddress = await vault.asset();
    const token = new ethers.Contract(assetAddress, ERC20_ABI, this.provider);
    const decimals = await token.decimals();
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    const tx = await vault.withdraw(parsedAmount, this.signer.address, this.signer.address);
    const receipt = await tx.wait();

    return {
      action: "withdraw",
      vault: vaultAddress,
      amount: amount.toString(),
      txHash: receipt.hash,
    };
  }

  /** Resolve the asset decimals for a vault */
  async _getVaultAssetDecimals(vaultAddress) {
    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.provider);
    const assetAddress = await vault.asset();
    const token = new ethers.Contract(assetAddress, ERC20_ABI, this.provider);
    return await token.decimals();
  }

  /** Deploy vault assets to Aave */
  async deployToAave(vaultAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.signer);
    const decimals = await this._getVaultAssetDecimals(vaultAddress);
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    const tx = await vault.deployToAave(parsedAmount);
    const receipt = await tx.wait();

    return {
      action: "deploy_to_aave",
      vault: vaultAddress,
      amount: amount.toString(),
      txHash: receipt.hash,
    };
  }

  /** Deploy vault assets to Compound */
  async deployToCompound(vaultAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.signer);
    const decimals = await this._getVaultAssetDecimals(vaultAddress);
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    const tx = await vault.deployToCompound(parsedAmount);
    const receipt = await tx.wait();

    return {
      action: "deploy_to_compound",
      vault: vaultAddress,
      amount: amount.toString(),
      txHash: receipt.hash,
    };
  }

  /** Withdraw from Aave back to vault */
  async withdrawFromAave(vaultAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.signer);
    const decimals = await this._getVaultAssetDecimals(vaultAddress);
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    const tx = await vault.withdrawFromAave(parsedAmount);
    const receipt = await tx.wait();

    return {
      action: "withdraw_from_aave",
      vault: vaultAddress,
      amount: amount.toString(),
      txHash: receipt.hash,
    };
  }

  /** Withdraw from Compound back to vault */
  async withdrawFromCompound(vaultAddress, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    const vault = new ethers.Contract(vaultAddress, USER_VAULT_ABI, this.signer);
    const decimals = await this._getVaultAssetDecimals(vaultAddress);
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    const tx = await vault.withdrawFromCompound(parsedAmount);
    const receipt = await tx.wait();

    return {
      action: "withdraw_from_compound",
      vault: vaultAddress,
      amount: amount.toString(),
      txHash: receipt.hash,
    };
  }

  /** Rebalance: move assets between Aave and Compound */
  async rebalance(vaultAddress, fromProtocol, toProtocol, amount) {
    if (!this.signer) throw new Error("Wallet not configured for writes");

    // Step 1: Withdraw from source protocol
    let withdrawResult;
    if (fromProtocol === "aave") {
      withdrawResult = await this.withdrawFromAave(vaultAddress, amount);
    } else if (fromProtocol === "compound") {
      withdrawResult = await this.withdrawFromCompound(vaultAddress, amount);
    } else {
      throw new Error(`Unknown source protocol: ${fromProtocol}`);
    }

    // Step 2: Deploy to target protocol
    let deployResult;
    if (toProtocol === "aave") {
      deployResult = await this.deployToAave(vaultAddress, amount);
    } else if (toProtocol === "compound") {
      deployResult = await this.deployToCompound(vaultAddress, amount);
    } else {
      throw new Error(`Unknown target protocol: ${toProtocol}`);
    }

    return {
      action: "rebalance",
      vault: vaultAddress,
      from: fromProtocol,
      to: toProtocol,
      amount: amount.toString(),
      withdrawTx: withdrawResult.txHash,
      deployTx: deployResult.txHash,
    };
  }
}
