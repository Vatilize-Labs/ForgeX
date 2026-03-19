# ForgeX: Vult — Complete Project Walkthrough

## What it is

ForgeX is a **yield-native DeFi protocol on Base** that stacks two yield sources into one vault position:

1. **ERC-4626 vault yield** — deposits routed to Aave and Compound for lending interest
2. **Uniswap v4 swap fee yield** — a custom hook (VultHook) intercepts swaps and harvests accrued vault yield, donating it back to LPs

Plus an **AI backend** powered by Claude that analyzes portfolios, recommends strategies, and assesses risk.

---

## Architecture (3 Layers)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend   │───▶│  AI Backend  │───▶│  Contracts   │
│  Next.js 14  │    │   FastAPI    │    │  Solidity    │
│  Wagmi/Viem  │    │  Claude API  │    │  Base L2     │
│  Reown AppKit│    │  Web3.py     │    │  Uniswap v4  │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## Smart Contracts

3 core contracts deployed on Base Mainnet:

| Contract | Address | Purpose |
|---|---|---|
| VaultFactory | `0x8374257da04F00ABAf74E13EFE5A17B0f08EC226` | User registration + vault deployment factory |
| VultHook | `0xe988b6816d94C10377779F08f2ab08925cE96D09` | Uniswap v4 hook for yield harvesting |
| Base PoolManager | `0x498581Ff718922c3f8e6A2444956aF099B2652b2` | Uniswap v4 reference |

### VaultFactory.sol — Entry point for the protocol

- User registration system (username, bio, timestamp)
- Admin management with role-based access
- Creates new `UserVault` instances via `createVault(asset, name, symbol)`
- Stores protocol addresses (Aave, Compound, Uniswap, WETH)
- Chainlink price feed registry for USD valuations

### UserVault.sol — ERC-4626 compliant tokenized vault

- Full deposit/withdraw/mint/redeem with proper share accounting
- **Aave integration** — `deployToAave()` / `withdrawFromAave()` for lending yield
- **Compound integration** — `deployToCompound()` / `withdrawFromCompound()` for cToken yield
- **Chainlink price feeds** — `getTotalValueUSD()`, `getSharePriceUSD()`, `getAssetPriceUSD()`
- Pause/unpause mechanism for emergencies
- Share tokens are ERC-20, enabling composability

### VultHook.sol — Uniswap v4 Hook (the key innovation)

- `afterAddLiquidity()` — moves injected liquidity into ForgeX vaults to earn yield
- `beforeSwap()` — withdraws vault assets if needed to ensure pool has enough liquidity
- `afterSwap()` — compares `totalAssets` vs `totalAssetsAccrued`, harvests the difference if > min threshold, donates yield back to LPs via `poolManager.donate()`

### How the yield stacking works

```
LP adds liquidity → VultHook deposits into ForgeX vault → Vault deploys to Aave/Compound
                                                              ↓
LP gets swap fees ← VultHook donates yield back ← Vault earns lending interest
```

---

## Frontend

**Stack:** Next.js 14, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Wagmi 3, Viem 2, Reown AppKit

### Pages

- `/` — Landing page (hero, stats strip, features grid, CTA). Three states: not connected (marketing), connected + not registered (registration form), connected + registered (welcome back)
- `/dashboard` — Stat cards, vault grid, AI insights panel with 3 tabs (Insights, Strategy, Risk)
- `/vaults` — Dedicated vault management with protocol info strip

### Key Components

- **Navbar** — `FORGEX : VULT` wordmark, nav links, `LaunchButton` + `<appkit-button />`
- **LaunchButton** — Connection status dot (red/green glow) + Launch App button (opens modal or routes to dashboard)
- **RegisterForm** — Username + bio form, calls `registerUser()` on-chain
- **CreateVaultModal** — Name, symbol, asset selection → calls `createVault()` factory
- **VaultCard** — Displays vault data, protocol allocations (Aave/Compound breakdown), inline deposit/withdraw with 2-step approve+execute flow
- **AIChat** — Floating chat widget (bottom-left), Claude-powered conversational assistant
- **AIInsights** — Dashboard panel with tabs for AI analysis, strategy advice, risk assessment

### Hooks

- `useVaultFactory` — `useIsRegistered()`, `useUserVaults()`, `useUserInfo()`, `useRegisterUser()`, `useCreateVault()`
- `useUserVault` — `useVaultData()` (multi-read: totalAssets, shares, USD values, protocol balances), `useVaultDeposit()` (approve+deposit), `useVaultWithdraw()`

### Wallet Connection

- Reown AppKit with `createAppKit()` called unconditionally in `Web3Provider.tsx`
- `ssr: true` on WagmiAdapter
- Networks: Base Mainnet + Base Sepolia
- Olive green theme variables on the modal

---

## AI Backend

**Stack:** Python FastAPI, Anthropic Claude (Sonnet 4), Web3.py

### Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/portfolio/{address}` | GET | Fetch on-chain portfolio via Web3.py |
| `/api/strategy` | POST | AI yield strategy advice (conservative/balanced/aggressive) |
| `/api/risk` | POST | AI risk assessment (score 1-10 + breakdown) |
| `/api/chat` | POST | Conversational AI assistant with history |
| `/api/insights` | POST | Dashboard bullet-point insights |
| `/api/platform-stats` | GET | Platform-wide statistics |

### How it works

1. Frontend calls endpoint with user address
2. Backend fetches on-chain data via Web3.py (vault balances, Aave/Compound deployed amounts, USD values, share prices)
3. Formats data as markdown context
4. Sends to Claude with role-specific system prompt
5. Returns analysis as text

---

## What's Been Done

- All 3 smart contracts written, tested (Hardhat + Foundry), and **deployed to Base Mainnet**
- Full frontend with wallet connection, registration, vault creation, deposit/withdraw flows
- AI backend with 4 analysis modes + chat
- Complete UI redesign with olive green theme (`#8FA828`), custom SVG logo, Framer Motion animations
- LaunchButton with connection status dot + modal trigger
- Production build passing clean

---

## What Can Be Added/Improved

### High Priority

1. **Multi-asset support** — Currently only WETH. Add USDC, DAI, cbETH as vault assets with their respective Chainlink feeds
2. **Protocol deployment UI** — No frontend controls to trigger `deployToAave()` / `deployToCompound()` yet. Users can create vaults and deposit but can't allocate to protocols from the UI
3. **Vault analytics page** — Historical yield tracking, deposit/withdrawal history, performance charts
4. **AI backend deployment** — Currently localhost:8000. Needs hosting (Railway, Fly.io, etc.) and the `NEXT_PUBLIC_AI_BACKEND_URL` env var set on Vercel

### Medium Priority

5. **VultHook UI integration** — No frontend for viewing hook activity, yield harvests, or LP positions
6. **Notification system** — Transaction confirmations beyond toasts; on-chain event listeners
7. **Portfolio page** — Aggregate view across all vaults with total USD value, combined yield rate
8. **Vault sharing** — Since shares are ERC-20, add transfer/delegation UI
9. **Mobile responsiveness** — Mobile bottom nav exists but some components could be tighter

### Nice to Have

10. **Dark/Light theme toggle** — AION has it, ForgeX is dark-only
11. **Transaction history** — On-chain event indexing for deposit/withdraw/yield events
12. **Real-time yield tracking** — WebSocket or polling for live vault balance updates
13. **Vault comparison tool** — Compare yields across different vault strategies
14. **Governance/Multisig** — Admin operations currently single-owner; could add timelock/multisig
