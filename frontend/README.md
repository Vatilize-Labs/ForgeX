# SmartX — Frontend

A modern Next.js frontend for SmartX - a decentralized vault platform enabling users to create multiple ERC-4626 compliant vaults for automated yield generation. Built with TypeScript, Tailwind CSS, and wagmi for Base Sepolia testnet.

## Overview

SmartX is a comprehensive DeFi platform that allows users to:

- **Create Multiple Vaults**: Each user can create multiple personal ERC-4626 compliant vaults
- **Automated Yield Generation**: Deploy assets to DeFi protocols (Aave, Compound, Uniswap) automatically
- **ERC-4626 Standard**: Industry-standard tokenized vault interface for maximum interoperability
- **Share-Based Ownership**: Transferable ERC-20 vault shares representing ownership
- **Protocol Allocations**: Configure how assets are distributed across different DeFi protocols

### Multi-Vault Management

- **Create multiple personal vaults** for different strategies or assets
- **ERC-4626 compliant vaults** with standardized interface
- **Track all vaults** in a unified dashboard
- **Manage vault configurations** individually

### Vault Operations

- **Deposit assets** into vaults and receive share tokens
- **Withdraw assets** by redeeming vault shares
- **Transfer vault shares** as ERC-20 tokens
- **Configure protocol allocations** (Aave, Compound, Uniswap)

### Automated Yield Generation

- **Multi-protocol deployment** to DeFi protocols
- **Strategy configuration** for each vault
- **Real-time performance tracking**
- **Yield harvesting** and compounding

Built for Ethereum-compatible chains, with primary deployment on Base Sepolia testnet.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Web3:** wagmi, viem, Reown AppKit (WalletConnect)
- **State Management:** React Hooks

## Design System

### Color Scheme

The SmartX frontend uses a sophisticated color palette featuring:
- **Primary Colors:** Shades of red for primary actions and branding
- **Neutral Colors:** Black, grey, and white for backgrounds, text, and UI elements
- **Accent Colors:** Red variations for highlights and interactive elements

This color scheme creates a modern, professional, and visually appealing interface that reflects the platform's DeFi focus.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## Project Structure

```
smartx-frontend/
├── app/              # Next.js app router pages
│   ├── vaults/      # Multi-vault management interface
│   ├── create/      # Vault creation page
│   ├── dashboard/   # User dashboard with all vaults
│   └── admin/       # Admin panel (if applicable)
├── components/       # React components
│   ├── vaults/      # Vault-related components
│   ├── shared/      # Shared UI components
│   └── layout/      # Layout components
├── config/          # Wagmi and adapter configuration
├── lib/             # Utilities and contract helpers
│   ├── abi/         # Contract ABIs
│   ├── contracts.ts # Contract interaction functions
│   └── utils.ts     # Helper utilities
└── hooks/           # Custom React hooks
    ├── useVaultFactory.ts
    └── useUserVault.ts
```

## Contributing

We welcome contributions! To get started:

1. **Pick an issue** from [`ISSUES.md`](./ISSUES.md)
2. **Create a branch** using the issue number: `issue/<number>-short-description`
3. **Implement your changes** following the issue's acceptance criteria
4. **Submit a PR** with the issue number in the title/description

When pushing your changes, include the issue number or title in your commit messages.

## Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_REOWN_PROJECT_ID=your_project_id
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_NETWORK=base-sepolia
```

**Note:** Contract addresses will be provided after deployment to Base Sepolia testnet.

## Network Configuration

- **Network:** Base Sepolia Testnet
- **Chain ID:** 84532
- **Explorer:** [Base Sepolia Explorer](https://sepolia.basescan.org/)

## License

See the main project LICENSE file.