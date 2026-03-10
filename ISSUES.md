# ForgeX Issues & Roadmap

## 🚀 Chainlink Integration

### Issue #1: Price Feeds Integration
**Status:** ✅ COMPLETED
**Description:** Integrate Chainlink Price Feeds to get real-time USD valuation of vault assets.
- **Tasks:**
  - [x] Add `AggregatorV3Interface`.
  - [x] Update `UserVault` to store price feed address.
  - [x] Implement `getAssetPrice()` function.
  - [x] Implement `getTotalValueUSD()` function.

### Issue #2: Automation Integration
**Status:** ✅ COMPLETED
**Description:** Use Chainlink Automation for rebalancing.
- **Tasks:**
  - [x] Implement `checkUpkeep` and `performUpkeep`.
  - [x] Register with Chainlink Automation.

### Issue #4: Unified Tri-Tone Brand Identity
**Status:** ✅ COMPLETED
**Description:** Implement a unified color scheme using Magenta (#FF007A), Cyan-Blue (#0EA7CB), and Electric Cyan (#00F0FF).
- **Tasks:**
  - [x] Configure global CSS variables (`#FF007A`, `#0EA7CB`, `#00F0FF`).
  - [x] Redesign hero section with tri-tone gradients and circle collage.
  - [x] Update navbar and footer iconography for color consistency.

## 🏁 Repository Health

### Issue #5: Contributor Meta-Data Audit & Purge
**Status:** ✅ COMPLETED
**Description:** Scrub history of legacy associations and ensure 100% account attribution accuracy.
- **Tasks:**
  - [x] Rewrite git history for all branches.
  - [x] Purge ghost PR objects from GitHub UI.
  - [x] Verify single contributor count.

## 🦄 UHI8 Hookathon

### Issue #6: Forge-Native Yield Hooks (Vult)
**Status:** ✅ COMPLETED
**Description:** Implement Uniswap v4 hooks to integrate ForgeX ERC-4626 vaults directly into liquidity pools on Base.
- **Tasks:**
  - [x] Correct real-time vault accounting in `UserVault`.
  - [x] Implement `VultHook.sol` for Uniswap v4.
  - [x] Add yield-direction logic in `afterAddLiquidity`.
  - [x] Add interest harvesting and LP donation in `afterSwap`.
  - [x] Unify branding to ForgeX Magenta theme.
  - [x] Deploy to Base Mainnet.
