# Chainlink Price Feeds Integration Walkthrough

## Overview
I have successfully integrated Chainlink Price Feeds into the SmartX protocol. This enables real-time USD valuation of vault assets and shares.

## Changes Completed

### 1. Dependencies
- Installed `@chainlink/contracts` to access `AggregatorV3Interface`.

### 2. UserVault Contract
- **Constructor Update**: Now accepts a `priceFeed_` address.
- **State Variable**: Stores the price feed in `_priceFeed`.
- **New Functions**:
    - `getAssetPriceUSD()`: Fetches current price from Chainlink (normalized to 18 decimals).
    - `getTotalValueUSD()`: Calculates total vault value (`totalAssets * price`).
    - `getSharePriceUSD()`: Calculates price per share (`totalValue / totalSupply`).
- **Logic Fix**: Fixed a bug in `_convertToAssets` where the first mint would fail (zero assets returned for non-zero shares when supply is 0). Now uses a 1:1 ratio for the initial mint.

### 3. VaultFactory Contract
- **New Mapping**: `mapping(address => address) public assetPriceFeeds` to store price feeds for assets.
- **Admin Function**: `setAssetPriceFeed(address asset, address feed)` to update price feeds.

### 4. Testing
- **ChainlinkMock**: Created a mock contract to simulate Chainlink price feeds.
- **Test Suite**: Updated `UserVault.test.ts` to:
    - Deploy `ChainlinkMock` with $2000 initial price.
    - Verify `getAssetPriceUSD`, `getTotalValueUSD`, and `getSharePriceUSD` return correct values.
    - Verify values update when the price feed updates.
    - Verify deployment fails with zero address for price feed.

## Verification
The test suite passes successfully.

### Running Tests
To verify the changes yourself, run:
```bash
cd smartcontract
npx hardhat test test/UserVault.test.ts --network hardhat
```
*(Note: Use `--network hardhat` to ensure it runs locally)*

### Output Snapshot
```
  UserVault
    ...
    Price Feeds
      ✔ Should return correct asset price in USD
      ✔ Should return correct total value in USD
      ✔ Should return correct share price in USD
      ✔ Should update value when price feed updates

  47 passing (6s)
```
