# ForgeX: Vult — Frontend

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16.1.1-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Wagmi](https://img.shields.io/badge/Wagmi-v3-8FA828?style=flat-square)](https://wagmi.sh)
[![Network](https://img.shields.io/badge/Base-Mainnet-0052FF?style=flat-square&logo=base)](https://basescan.org)

Next.js 16.1.1 frontend for the ForgeX yield-native DeFi protocol on Base. 8 pages, real-time on-chain data, AI-powered insights, and a full dark/light olive green design system.

**[Live App](https://forgex-vult.vercel.app/) · [Demo Video](YOUR_DEMO_VIDEO_LINK_HERE) · [Main Repo](https://github.com/BitBand-Labs/forgeX)**

</div>

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 16.1.1 | App Router, SSR, file-based routing |
| React | 19.2.0 | UI rendering |
| TypeScript | 5.x | Full type safety across hooks + components |
| Tailwind CSS | v4 | Utility styling (JIT, CSS variables) |
| Wagmi | v3 | React hooks for Ethereum |
| Viem | v2 | Low-level on-chain reads and writes |
| Reown AppKit | latest | Wallet modal + `<appkit-button />` |
| Framer Motion | latest | Page transitions, card reveals, skeleton loaders |
| Lucide React | latest | Icon library |

---

## Design System

**Olive green** theme with warm neutrals — engineered for dark DeFi UX, full light mode supported.

| Token | Dark Value | Light Value | Usage |
|-------|-----------|------------|-------|
| `--primary` | `#8FA828` | `#6D8020` | CTAs, active nav, badges, borders |
| `--primary-hover` | `#A4C030` | `#7D9424` | Hover states |
| `--primary-muted` | `rgba(143,168,40,0.10)` | `rgba(109,128,32,0.12)` | Active nav backgrounds |
| `--background` | `#090A06` | `#F5F4EE` | Page background |
| `--surface` | `#111306` | `#EDEBE0` | Section backgrounds |
| `--card` | `#181B0C` | `#E8E5D8` | Card surfaces |
| `--foreground` | `#E8E2CF` | `#1A1C10` | Body text |
| `--foreground-muted` | `#918E78` | `#5C5940` | Labels, secondary text |
| `--accent` | `#C8A84B` | `#A07830` | Brand accent ("VULT" wordmark) |
| `--border` | `rgba(143,168,40,0.12)` | `rgba(109,128,32,0.15)` | Card borders |

Theme is toggled via `ThemeToggle` (navbar, sun/moon icon), applied as `data-theme="light"` on `<html>`, and persisted to `localStorage`.

---

## Pages

```mermaid
graph LR
    A[/ — Landing] --> B[/dashboard]
    B --> C[/vaults]
    B --> D[/analytics]
    B --> E[/portfolio]
    B --> F[/compare]
    B --> G[/history]
    B --> H[/hook]
    B --> I[/automation]
```

| Route | File | What It Does |
|-------|------|--------------|
| `/` | `app/page.tsx` | Hero, protocol stats, feature cards, wallet connect, registration |
| `/dashboard` | `app/dashboard/page.tsx` | Vault grid overview + AI insights panel (3 tabs) + user profile card |
| `/vaults` | `app/vaults/page.tsx` | Full vault management — Deposit, Withdraw, Allocate, Share, Admin |
| `/analytics` | `app/analytics/page.tsx` | Per-vault: yield %, USD value, share price, Aave/Compound/Idle bar |
| `/portfolio` | `app/portfolio/page.tsx` | Aggregated: total USD, combined yield, allocation bar, per-vault table |
| `/compare` | `app/compare/page.tsx` | Side-by-side vault comparison grid — horizontally scrollable |
| `/history` | `app/history/page.tsx` | On-chain Deposit/Withdraw events via `getLogs`, linked to BaseScan |
| `/automation` | `app/automation/page.tsx` | Chainlink Automation status per vault + 5-step registration guide |
| `/hook` | `app/hook/page.tsx` | VultHook addresses, 3-step explainer, hook flags, specs |

---

## Components

| Component | File | Description |
|-----------|------|-------------|
| `Navbar` | `components/Navbar.tsx` | Logo, 8 nav links (registered users only), ThemeToggle, LaunchButton, wallet button |
| `LaunchButton` | `components/LaunchButton.tsx` | Connection status dot + "Launch App" / "Connect Wallet" CTA |
| `ThemeToggle` | `components/ThemeToggle.tsx` | Sun/Moon icon, toggles dark/light, persists to localStorage |
| `VaultCard` | `components/VaultCard.tsx` | Full vault management: Deposit / Withdraw / Allocate / Share / Admin (owner only) |
| `CreateVaultModal` | `components/CreateVaultModal.tsx` | Vault creation: name, symbol, asset (WETH / USDC / DAI / USDT) |
| `RegisterForm` | `components/RegisterForm.tsx` | Username + bio input, calls `registerUser()` on-chain |
| `AIInsights` | `components/AIInsights.tsx` | Dashboard AI panel — Insights / Strategy / Risk tabs |
| `AIChat` | `components/AIChat.tsx` | Floating bottom-left chat widget (Claude Sonnet powered) |
| `Toast` | `components/Toast.tsx` | Notifications: `success` / `error` / `info` / `tx` (with BaseScan link) |
| `SecurityNotice` | `components/SecurityNotice.tsx` | Dismissible amber banner: "Unaudited Contracts — Use at Your Own Risk" |
| `HeroIllustration` | `components/HeroIllustration.tsx` | Landing page SVG illustration |
| `ClientLayout` | `components/ClientLayout.tsx` | Wraps `<ToastProvider>`, `<Navbar>`, `<AIChat>` |

---

## Hooks

### `hooks/useVaultFactory.ts`

Reads from and writes to `VaultFactory.sol`:

| Hook | Description |
|------|-------------|
| `useIsRegistered()` | Returns `boolean` — whether connected address has registered |
| `useUserVaults()` | Returns `address[]` — all vault addresses for connected user |
| `useUserInfo()` | Returns `{ username, bio, registeredAt }` from chain |
| `useRegisterUser()` | Calls `registerUser(username, bio)` — returns `{ register, isPending, isSuccess }` |
| `useCreateVault()` | Calls `createVault(asset, name, symbol)` — returns `{ create, isPending, isSuccess }` |

### `hooks/useUserVault.ts`

Reads from and writes to individual `UserVault.sol` instances:

| Hook | Description |
|------|-------------|
| `useVaultData(address)` | Multi-read: totalAssets, accrued, shares, USD values, Aave/Compound balances, paused. **Polls every 30s** for real-time yield. |
| `useVaultDeposit(address)` | 2-step: ERC-20 `approve()` then `deposit()`. Handles allowance check. |
| `useVaultWithdraw(address)` | Calls `withdraw(assets, receiver, owner)` |
| `useDeployToAave(address)` | Calls `deployToAave(amount)` |
| `useDeployToCompound(address)` | Calls `deployToCompound(amount)` |
| `useWithdrawFromAave(address)` | Calls `withdrawFromAave(amount)` |
| `useWithdrawFromCompound(address)` | Calls `withdrawFromCompound(amount)` |
| `useTransferShares(address)` | ERC-20 `transfer()` for vault share tokens — vault sharing feature |

---

## Real-Time Data

All `useReadContract` calls in `useVaultData` use `refetchInterval: 30_000` — every 30 seconds the UI automatically re-fetches:

- `totalAssets()` and `totalAssetsAccrued()`
- `balanceOf(user)` (shares held)
- `getTotalValueUSD()`, `getSharePriceUSD()`
- `getAaveBalance()`, `getCompoundBalance()`
- `paused()` state

No manual refresh needed — yield updates are visible in real time.

---

## On-Chain Event Log (History Page)

The `/history` page fetches `Deposit` and `Withdraw` events directly from the chain using Viem's `getLogs`:

```ts
const logs = await publicClient.getLogs({
  address: vaultAddress,
  event: parseAbiItem('event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)'),
  fromBlock: latestBlock - 50_000n,
  toBlock: latestBlock,
});
```

Events from all user vaults are fetched in parallel via `Promise.all`, merged, sorted by block (descending), and linked to BaseScan transaction hashes.

---

## AI Integration

The frontend connects to the FastAPI AI backend at `NEXT_PUBLIC_AI_BACKEND_URL`:

| Endpoint | Frontend Trigger |
|----------|-----------------|
| `POST /api/insights` | Dashboard "Insights" tab loads |
| `POST /api/strategy` | Dashboard "Strategy" tab loads |
| `POST /api/risk` | Dashboard "Risk" tab loads |
| `POST /api/chat` | AIChat widget message submit |
| `GET  /api/portfolio/{address}` | Dashboard portfolio data |

All requests include the connected wallet address and current vault state. Responses are streamed and rendered in the UI with loading skeletons.

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx                # Root layout — Web3Provider + ClientLayout
│   ├── globals.css               # Design tokens, dark + light themes, keyframes
│   ├── page.tsx                  # Landing page
│   ├── dashboard/page.tsx
│   ├── vaults/page.tsx
│   ├── analytics/page.tsx
│   ├── portfolio/page.tsx
│   ├── compare/page.tsx
│   ├── history/page.tsx
│   ├── hook/page.tsx
│   └── automation/page.tsx
├── components/                   # 12 React components
├── context/
│   └── Web3Provider.tsx          # createAppKit (unconditional, ssr: true) + WagmiProvider
├── config/
│   └── wagmi.ts                  # projectId, networks (base + baseSepolia)
├── hooks/
│   ├── useVaultFactory.ts        # VaultFactory contract hooks
│   └── useUserVault.ts           # UserVault contract hooks
├── lib/
│   ├── abis.ts                   # VAULT_FACTORY_ABI, USER_VAULT_ABI, ERC20_ABI
│   ├── constants.ts              # Contract addresses, token addresses, AI_BACKEND_URL
│   └── ai.ts                     # Fetch helpers for AI backend endpoints
└── public/
    ├── logo.svg
    └── favicon.svg
```

---

## Wallet Connection

- **Provider:** Reown AppKit with `createAppKit()` called unconditionally at module level in `Web3Provider.tsx`
- **WagmiAdapter:** configured with `ssr: true` for Next.js SSR compatibility
- **Networks:** Base Mainnet + Base Sepolia
- **UI:** `<appkit-button />` and `<appkit-network-button />` web components used in Navbar and landing page
- **Guard:** nav links only render when `isConnected && isRegistered` — unregistered users see the registration flow first

---

## Environment Variables

Create `frontend/.env.local` (never commit — see `.env.example` for reference):

```env
# Required — get a project ID at https://cloud.reown.com
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id

# AI Backend (deployed on Render, or localhost for dev)
NEXT_PUBLIC_AI_BACKEND_URL=https://forgex-14vp.onrender.com
```

---

## Quick Start

```bash
cd frontend
npm install

# Copy the example env file and fill in values
cp .env.example .env.local

npm run dev          # → http://localhost:3000
npm run build        # production build
npm run lint         # ESLint
```

---

## Deployment

Frontend is deployed on **Vercel**.

1. Import the GitHub repo into Vercel
2. Set **Root Directory** to `frontend`
3. Add environment variables: `NEXT_PUBLIC_REOWN_PROJECT_ID`, `NEXT_PUBLIC_AI_BACKEND_URL`
4. Deploy — Vercel handles the Next.js build automatically

---

## Network

| Network | Chain ID | Explorer |
|---------|----------|----------|
| Base Mainnet | 8453 | [basescan.org](https://basescan.org) |
| Base Sepolia | 84532 | [sepolia.basescan.org](https://sepolia.basescan.org) |
