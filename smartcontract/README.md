# ForgeX: Vult — Smart Contracts

<div align="center">

[![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-363636?style=flat-square&logo=solidity)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-primary-FFF100?style=flat-square)](https://hardhat.org)
[![Foundry](https://img.shields.io/badge/Foundry-secondary-orange?style=flat-square)](https://book.getfoundry.sh)
[![Network](https://img.shields.io/badge/Base-Mainnet-0052FF?style=flat-square&logo=base)](https://basescan.org)
[![Uniswap v4](https://img.shields.io/badge/Uniswap-v4%20Hook-FF007A?style=flat-square)](https://github.com/Uniswap/v4-core)
[![ERC-4626](https://img.shields.io/badge/ERC--4626-Vaults-6366f1?style=flat-square)](https://eips.ethereum.org/EIPS/eip-4626)

Solidity smart contracts for the ForgeX yield-native DeFi protocol. Deployed on Base Mainnet. Built with Hardhat (TypeScript tests) + Foundry (Solidity tests) for dual test coverage.

**[VaultFactory on BaseScan](https://basescan.org/address/0x8374257da04F00ABAf74E13EFE5A17B0f08EC226) · [VultHook on BaseScan](https://basescan.org/address/0xe988b6816d94C10377779F08f2ab08925cE96D09) · [Uniswap v4-core](https://github.com/Uniswap/v4-core)**

</div>

---

## Deployed Contracts — Base Mainnet

| Contract | Address | BaseScan |
|----------|---------|----------|
| **VaultFactory** | `0x8374257da04F00ABAf74E13EFE5A17B0f08EC226` | [View](https://basescan.org/address/0x8374257da04F00ABAf74E13EFE5A17B0f08EC226) |
| **VultHook** | `0xe988b6816d94C10377779F08f2ab08925cE96D09` | [View](https://basescan.org/address/0xe988b6816d94C10377779F08f2ab08925cE96D09) |
| **Base PoolManager** | `0x498581Ff718922c3f8e6A2444956aF099B2652b2` | [View](https://basescan.org/address/0x498581Ff718922c3f8e6A2444956aF099B2652b2) |

---

## Architecture

```mermaid
graph TD
    subgraph "ForgeX Protocol"
        VF[VaultFactory.sol\nregistration + vault deployment]
        UV[UserVault.sol\nERC-4626 tokenized vault]
        VH[VultHook.sol\nUniswap v4 hook]
    end

    subgraph "External"
        PM[Uniswap v4 PoolManager]
        AAVE[Aave V3 Lending Pool]
        COMP[Compound V2 cToken]
        CL[Chainlink Price Feed]
    end

    USER -->|registerUser / createVault| VF
    VF -->|deploy new instance| UV
    USER -->|deposit / withdraw| UV
    UV -->|deployToAave| AAVE
    UV -->|deployToCompound| COMP
    UV -->|getAssetPriceUSD| CL

    PM -->|afterAddLiquidity| VH
    VH -->|deposit idle capital| UV
    PM -->|afterSwap| VH
    VH -->|withdraw yield delta| UV
    VH -->|poolManager.donate| PM
```

---

## VultHook — How Yield Harvesting Works

VultHook is the core innovation. It is a Uniswap v4 hook that operates entirely automatically at the pool level.

```mermaid
sequenceDiagram
    participant LP as Liquidity Provider
    participant PM as PoolManager (v4)
    participant VH as VultHook
    participant UV as UserVault (ERC-4626)
    participant EXT as Aave / Compound

    LP->>PM: addLiquidity()
    PM->>VH: afterAddLiquidity()
    VH->>UV: deposit(idleLPCapital)
    UV->>EXT: supply() / mint()
    EXT-->>UV: aTokens / cTokens (accruing)

    LP->>PM: swap()
    PM->>VH: beforeSwap() — rebalance if needed
    PM->>VH: afterSwap()
    VH->>UV: totalAssetsAccrued() vs totalAssets()
    Note over VH: delta > 1000 wei → harvest yield
    VH->>UV: withdraw(delta)
    EXT-->>UV: principal + yield
    UV-->>VH: yield amount
    VH->>PM: poolManager.donate(token0yield, token1yield)
    PM-->>LP: yield credited to LP position
```

### Active Hook Flags

| Flag | Status | Purpose |
|------|--------|---------|
| `beforeInitialize` | ✗ | — |
| `afterInitialize` | ✗ | — |
| `beforeAddLiquidity` | ✗ | — |
| **`afterAddLiquidity`** | **✓** | Deposits idle LP capital into vaults |
| `beforeRemoveLiquidity` | ✗ | — |
| `afterRemoveLiquidity` | ✗ | — |
| **`beforeSwap`** | **✓** | Ensures sufficient liquidity for the swap |
| **`afterSwap`** | **✓** | Harvests yield delta → donates to LPs |

---

## Contract Reference

### VaultFactory.sol

Central registry. Manages user registration and vault deployment. One factory, many vaults.

**Key Functions:**

| Function | Visibility | Description |
|----------|-----------|-------------|
| [`registerUser(username, bio)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L208) | external | Register an on-chain user profile |
| [`createVault(asset, name, symbol)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L264) | external | Deploy a new `UserVault` for the caller |
| [`getUserVaults(user)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L384) | view | Returns `address[]` of all vaults for a user |
| [`getUserInfo(user)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L328) | view | Returns `username, bio, registeredAt` |
| [`isUserRegistered(user)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L316) | view | Returns `bool` registration status |
| [`addAdmin(address)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L431) | onlyOwner | Grant admin role |
| [`removeAdmin(address)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/VaultFactory.sol#L444) | onlyOwner | Revoke admin role |

**Events:**
```solidity
event VaultCreated(address indexed owner, address indexed vault, address indexed asset, uint256 timestamp);
event UserRegistered(address indexed user, string username, uint256 timestamp);
```

---

### UserVault.sol — ERC-4626 Tokenized Vault

Each user gets their own `UserVault` instance. Fully ERC-4626 compliant with multi-protocol yield allocation and Chainlink USD valuations.

**ERC-4626 Core:**

| Function | Description |
|----------|-------------|
| [`deposit(assets, receiver)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L211) | Deposit assets, receive proportional shares |
| [`withdraw(assets, receiver, owner)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L261) | Withdraw assets, burn shares |
| [`mint(shares, receiver)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L236) | Mint exact share count |
| [`redeem(shares, receiver, owner)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L293) | Redeem shares for assets |
| [`totalAssets()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L173) | Total assets under management (vault + Aave + Compound) |
| [`convertToShares(assets)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L329) | Preview share count for asset amount |
| [`convertToAssets(shares)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L336) | Preview asset amount for share count |
| `previewDeposit/Withdraw/Mint/Redeem` | EIP-4626 preview functions (L371–L394) |

**Protocol Allocation:**

| Function | Description |
|----------|-------------|
| [`deployToAave(amount)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L661) | Supply assets to Aave V3 lending pool |
| [`deployToCompound(amount)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L582) | Mint Compound cTokens |
| [`withdrawFromAave(amount)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L691) | Redeem from Aave |
| [`withdrawFromCompound(amount)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L615) | Redeem cTokens from Compound |
| [`getAaveBalance()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L717) | Assets currently tracked in Aave |
| [`getCompoundBalance()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L644) | Live balance from Compound (triggers accrual) |
| [`totalAssetsAccrued()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L185) | Total assets including all accrued interest |

**Chainlink USD Valuations:**

| Function | Description |
|----------|-------------|
| [`getTotalValueUSD()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L416) | Total vault value in USD (18 decimals) |
| [`getSharePriceUSD()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L428) | Per-share price in USD |
| [`getAssetPriceUSD()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L404) | Underlying asset spot price from Chainlink feed |

**Admin:**

| Function | Description |
|----------|-------------|
| [`pause()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L736) / [`unpause()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/UserVault.sol#L746) | Emergency circuit breaker |
| `transferOwnership(newOwner)` | Governance — standard Ownable |
| `owner()` | Returns current vault owner |

---

### VultHook.sol — Uniswap v4 Hook

Integrates with Uniswap v4's hook architecture. Deployed at an address with the correct leading bits to activate the three hook flags.

**References:** [Uniswap v4-core](https://github.com/Uniswap/v4-core) · [Hook Docs](https://docs.uniswap.org/contracts/v4/overview)

**Key Functions:**

| Function | Called By | Description |
|----------|-----------|-------------|
| [`_afterAddLiquidity(...)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/vult/VultHook.sol#L62) | PoolManager | Deposits idle LP capital into ForgeX vaults |
| [`_beforeSwap(...)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/vult/VultHook.sol#L93) | PoolManager | Ensures adequate liquidity for the swap |
| [`_afterSwap(...)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/vult/VultHook.sol#L106) | PoolManager | Computes yield delta → `poolManager.donate()` to LPs |
| [`getHookPermissions()`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/vult/VultHook.sol#L40) | PoolManager | Returns active hook flags bitmask |
| [`setVaultForAsset(asset, vault)`](https://github.com/BitBand-Labs/forgeX/blob/main/smartcontract/contracts/vult/VultHook.sol#L151) | admin | Registers a ForgeX vault for a pool token address |

**Constructor Parameters:**
- `IPoolManager _poolManager` — Uniswap v4 PoolManager (`0x498581Ff718922c3f8e6A2444956aF099B2652b2`)
- `IUserVault _vault` — ForgeX vault to route liquidity through

---

## Project Structure

```
smartcontract/
├── contracts/
│   ├── VaultFactory.sol              # User registration + vault factory
│   ├── UserVault.sol                 # ERC-4626 vault + Aave + Compound + Chainlink
│   ├── vult/
│   │   └── VultHook.sol              # Uniswap v4 yield harvesting hook
│   ├── interfaces/
│   │   ├── IERC4626.sol              # ERC-4626 standard interface
│   │   ├── IUserVault.sol            # ForgeX vault interface (used by VultHook)
│   │   ├── IPool.sol                 # Aave V3 IPool
│   │   ├── IAToken.sol               # Aave aToken interface
│   │   └── ICToken.sol               # Compound cToken interface
│   └── mocks/                        # Test doubles (MockPoolManager, MockUserVault,
│                                     #   SimpleERC20, v4 types/interfaces/libraries)
├── test/
│   ├── UserVault.test.ts             # ~40 unit + integration tests
│   ├── VaultFactory.test.ts          # Registration + vault creation + admin roles
│   ├── UserVault2.test.ts            # Extended vault edge cases
│   ├── IERC4626.test.ts              # ERC-4626 compliance suite
│   ├── VultHook.test.ts              # Hook integration tests
│   └── foundry/
│       └── VultHook.t.sol            # Forge tests (Solidity)
├── scripts/
│   └── deploy.ts                     # Hardhat deployment scripts
├── hardhat.config.ts
├── foundry.toml
└── package.json
```

---

## Quick Start

### Hardhat (Primary)

```bash
cd smartcontract
npm install

# Compile
npx hardhat compile

# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/UserVault.test.ts

# Gas report
REPORT_GAS=true npx hardhat test

# Coverage
npx hardhat coverage

# Deploy to Base Mainnet
npx hardhat run scripts/deploy.ts --network base
```

### Foundry (Secondary)

```bash
# Install Foundry dependencies
forge install

# Build
forge build

# Run Forge tests
forge test

# Verbose output
forge test -vvv

# Run specific test
forge test --match-test testVultHookAfterSwap -vvv
```

---

## Test Coverage

| Test File | Tests | Covers |
|-----------|-------|--------|
| `UserVault.test.ts` | ~40 | Deposit, withdraw, share math, protocol allocation, Chainlink feeds, pause/unpause, reentrancy |
| `VaultFactory.test.ts` | — | Registration, vault creation, admin role management |
| `UserVault2.test.ts` | — | Edge cases: zero amounts, max values, multi-user scenarios |
| `IERC4626.test.ts` | — | Full ERC-4626 compliance: previewDeposit, previewWithdraw, convertTo* |
| `VultHook.test.ts` | — | Hook lifecycle: afterAddLiquidity, beforeSwap, afterSwap, donate |
| `foundry/VultHook.t.sol` | — | Forge-native Solidity tests for hook integration |

---

## Security

- **OpenZeppelin v5** base contracts: `Ownable`, `ReentrancyGuard`, `Pausable`
- **ReentrancyGuard** on all state-changing vault functions (`deposit`, `withdraw`, `deployToAave`, etc.)
- **Chainlink** price feeds for manipulation-resistant USD values (no TWAP manipulation vector)
- **Pause mechanism** for emergency stops — owner can freeze all vault operations
- **Admin role separation** — vault owner vs. registered admins vs. factory owner
- **ERC-4626 share math** reviewed for virtual shares inflation attack protection
- **Hook address validation** — VultHook address must have correct prefix bits for flag activation

> **Audit Status:** Contracts are deployed to Base Mainnet but have **not** undergone a formal third-party security audit. Built on audited base contracts (OpenZeppelin v5, Uniswap v4-core). Use at your own risk.

---

## Environment Variables

Create `smartcontract/.env` (never commit):

```env
PRIVATE_KEY=your_deployer_private_key
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=your_basescan_api_key
ALCHEMY_API_KEY=your_alchemy_api_key
```

---

## Network Configuration

| Network | Chain ID | RPC | Explorer |
|---------|----------|-----|----------|
| Base Mainnet | 8453 | `https://mainnet.base.org` | [basescan.org](https://basescan.org) |
| Base Sepolia | 84532 | `https://sepolia.base.org` | [sepolia.basescan.org](https://sepolia.basescan.org) |

---

## Dependencies

| Dependency | Purpose |
|-----------|---------|
| `@openzeppelin/contracts` v5 | Ownable, ReentrancyGuard, Pausable, ERC20 |
| `@uniswap/v4-core` | IHooks, PoolKey, BalanceDelta, IPoolManager |
| `@uniswap/v4-periphery` | BaseHook |
| `@chainlink/contracts` | AggregatorV3Interface |
| Aave V3 interfaces | IPool, IAToken |
| Compound V2 interfaces | ICToken |

---

## License

MIT License
