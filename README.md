# ForgeX

A decentralized vault platform enabling users to create multiple ERC-4626 compliant vaults for automated yield generation on Base Mainnet.

## Scenario

A. On-chain Dollar Savings for Africans

Users deposit USDC/USDT

Receive a deposit token (dToken)

Earn yield from low-risk DeFi

Fully transparent reserves on-chain

👉 Think: PiggyVest + Risevest + USDC, but on-chain



## Overview

ForgeX is a comprehensive DeFi platform that allows users to:

- **Create Multiple Vaults**: Each user can create multiple personal ERC-4626 compliant vaults
- **Automated Yield Generation**: Deploy assets to DeFi protocols (Aave, Compound, Uniswap) automatically
- **ERC-4626 Standard**: Industry-standard tokenized vault interface for maximum interoperability
- **Share-Based Ownership**: Transferable ERC-20 vault shares representing ownership
- **Protocol Allocations**: Configure how assets are distributed across different DeFi protocols

## Project Structure

```
ForgeX/
├── smartcontract/          # Solidity smart contracts
│   ├── contracts/          # Contract source files
│   ├── test/              # Contract tests
│   ├── scripts/           # Deployment scripts
│   └── README.md          # Smart contract documentation
│
└── frontend/              # Next.js frontend application
    ├── app/               # Next.js app router pages
    ├── components/        # React components
    ├── config/            # Wagmi and wallet configuration
    └── README.md          # Frontend documentation
```

## Tech Stack

### Smart Contracts
- **Language:** Solidity ^0.8.20
- **Framework:** Hardhat
- **Network:** Base Mainnet
- **Standards:** ERC-4626, ERC-20

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Tri-Tone Design System)
- **Web3:** wagmi, viem, Reown AppKit

## Design System

ForgeX utilizes a vibrant, high-contrast tri-tone color scheme:

- **Magenta (Primary)**: `#FF007A` — Main brand identity and primary action elements.
- **Cyan-Blue (Secondary)**: `#0EA7CB` — AION Legacy color used for secondary navigation and branding.
- **Electric Cyan (Accent)**: `#00F0FF` — Neon highlights, gradients, and interactive glow effects.

## Quick Start

### Smart Contracts

```bash
cd smartcontract
npm install
npx hardhat compile
npx hardhat test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features

### VaultFactory Contract
- Multi-vault creation for registered users
- User registration system with username and bio
- Protocol address management (Aave, Compound, Uniswap, WETH)
- Admin system for protocol configuration
- Vault tracking and ownership management

### UserVault Contract (ERC-4626)
- ERC-4626 standard compliance for tokenized vaults
- ERC-20 share tokens representing vault ownership
- Deposit/Withdraw/Mint/Redeem operations
- Protocol integration for yield generation
- Allocation management across DeFi protocols
- Pause/unpause functionality

### Frontend Features
- Wallet connection (MetaMask, WalletConnect)
- Multi-vault dashboard
- Vault creation interface
- Deposit and withdrawal operations
- Protocol allocation management
- Share transfer functionality
- Transaction history

## Network Configuration

### Base Mainnet
- **Chain ID:** 8453
- **RPC URL:** `https://mainnet.base.org`
- **Explorer:** [BaseScan](https://basescan.org/)
- **VaultFactory:** [`0x8374257da04F00ABAf74E13EFE5A17B0f08EC226`](https://basescan.org/address/0x8374257da04F00ABAf74E13EFE5A17B0f08EC226)
- **VultHook:** [`0xe988b6816d94C10377779F08f2ab08925cE96D09`](https://basescan.org/address/0xe988b6816d94C10377779F08f2ab08925cE96D09)

## Development

### Smart Contracts

See [smartcontract/README.md](./smartcontract/README.md) for detailed smart contract documentation.

**Key Commands:**
```bash
npm run compile      # Compile contracts
npm run test         # Run tests
npm run deploy       # Deploy to Base Mainnet
```

### Frontend

See [frontend/README.md](./frontend/README.md) for detailed frontend documentation.

**Key Commands:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run linter
```

## Contributing

We welcome contributions! To get started:

1. Pick an issue from the respective `ISSUES.md` files:
   - [Smart Contract Issues](./smartcontract/ISSUES.md)
   - [Frontend Issues](./frontend/ISSUES.md)
2. Create a branch: `issue/<number>-short-description`
3. Implement your changes following the acceptance criteria
4. Write tests for your changes
5. Submit a PR with the issue number in the title/description

## Environment Variables

### Smart Contracts (.env)
```env
PRIVATE_KEY=your_private_key
BASE_RPC_URL=https://mainnet.base.org
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_NETWORK=base
```

**Note:** Never commit your private keys or `.env` files to version control!

## Security

- All contracts follow best practices
- Access control implemented for admin functions
- Reentrancy guards on critical functions
- Input validation on all user inputs
- Comprehensive test coverage

**Note:** Contracts should be audited before mainnet deployment.

## Future Enhancements

### Chainlink Integration Roadmap

ForgeX is designed to integrate with Chainlink services for enhanced functionality and automation. The following enhancements are planned for future releases:

#### Phase 1: Price Feeds (In Progress)
**Status:** Planned for next release

- **Chainlink Price Feeds Integration**
  - Real-time USD valuation of vault assets
  - Accurate share pricing in USD terms
  - Multi-asset vault support with proper pricing
  - Portfolio performance tracking

**Implementation:**
- Add Chainlink Price Feed to `UserVault.sol`
- Implement `getTotalValueUSD()` and `getSharePriceUSD()` functions
- Display USD values in frontend dashboard
- Enable better portfolio tracking and analytics

**Files to modify:**
- `contracts/UserVault.sol` - Add price feed integration
- `contracts/VaultFactory.sol` - Store price feed addresses
- Frontend components - Display USD values

---

#### Phase 2: Automation (High Impact)
**Status:** Future consideration

- **Chainlink Automation (formerly Keepers)**
  - Automated vault rebalancing
  - Periodic yield harvesting
  - Protocol switching based on yield
  - Gas-optimized execution

**Implementation:**
- Implement `checkUpkeep()` and `performUpkeep()` in `UserVault.sol`
- Set up rebalancing logic based on protocol yields
- Register vaults with Chainlink Automation network
- Automated yield optimization without manual intervention

**Files to modify:**
- `contracts/UserVault.sol` - Add automation interface and rebalancing logic
- `contracts/VaultFactory.sol` - Automation registry management

**Benefits:**
- Hands-free vault management
- Optimal yield allocation
- Reduced gas costs through batching
- 24/7 monitoring and execution

---

#### Phase 3: VRF (Optional - Gamification)
**Status:** Future consideration

- **Chainlink VRF (Verifiable Random Function)**
  - Lottery/reward system for vault holders
  - Random protocol selection for diversification
  - Fair incentive distribution mechanisms
  - Gamification features

**Implementation:**
- Add lottery/reward system to `VaultFactory.sol`
- Implement VRF for provably fair random selection
- Create incentive mechanisms for long-term holders
- Monthly/quarterly reward distributions

**Files to modify:**
- `contracts/VaultFactory.sol` - Add VRF integration and lottery logic
- Frontend - Lottery participation interface

**Use Cases:**
- Monthly lottery for active vault holders
- Random bonus yield distribution
- Fair protocol allocation
- Community engagement rewards

---

#### Phase 4: Uniswap v4 Hook Integration (UHI Project)
**Status:** In Progress (UHI8 Hookathon Start: March 2, 2026)

- **Forge-Native Yield Hooks**
  - Enable ForgeX ERC-4626 vault shares to serve as active liquidity in Uniswap v4 pools.
  - Implement **Yield-Aware Hooks** that distribute vault-accrued interest to LPs.
  - Maximize capital efficiency for African savings users by layering trading fees on top of DeFi yield.

**Implementation:**
- Integrate `IHooks` interface with `UserVault.sol` logic.
- Build specialized liquidity pools for vault-wrapped assets.
- Deploy UHI capstone project on Base Mainnet.

---

### Additional Planned Features

- **Multi-signature Admin Controls** - Enhanced security for protocol management
- **Governance System** - Community-driven protocol decisions
- **Advanced Analytics** - Detailed performance metrics and historical data
- **Mobile App** - Native mobile experience for iOS and Android
- **Subgraph Integration** - Faster data queries and historical tracking

## License

MIT License - see LICENSE file for details.

## Links

- **Repository:** [https://github.com/thebabalola/forge](https://github.com/thebabalola/forge)
- **BaseScan Explorer:** [https://basescan.org/](https://basescan.org/)
- **Documentation:** See individual README files in `smartcontract/` and `frontend/` directories

## Support

For questions or issues, please open an issue on GitHub or refer to the respective ISSUES.md files for planned features and known issues.
