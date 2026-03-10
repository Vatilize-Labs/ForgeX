// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "@uniswap/v4-core/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUserVault} from "./interfaces/IUserVault.sol";

/**
 * @title VultHook
 * @dev Uniswap v4 Hook that integrates ForgeX ERC-4626 vaults for yield generation.
 * @notice This hook moves idle pool assets into vaults during liquidity additions and swaps.
 */
contract VultHook is BaseHook {
    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    // Mapping of asset tokens to their corresponding ForgeX vaults
    mapping(address => address) public assetToVault;

    /*//////////////////////////////////////////////////////////////
                             CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    /*//////////////////////////////////////////////////////////////
                             HOOK OVERRIDES
    //////////////////////////////////////////////////////////////*/

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: true,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /**
     * @dev Move injected liquidity into ForgeX vaults after it's added to the pool.
     */
    function afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) external override returns (bytes4, BalanceDelta) {
        address vault0 = assetToVault[key.currency0.tokenAddress()];
        address vault1 = assetToVault[key.currency1.tokenAddress()];

        // If vault exists for currency0, move assets
        if (vault0 != address(0) && delta.amount0() > 0) {
            uint256 amount = uint256(uint128(delta.amount0()));
            IERC20(key.currency0.tokenAddress()).approve(vault0, amount);
            IUserVault(vault0).deposit(amount, address(this));
        }

        // If vault exists for currency1, move assets
        if (vault1 != address(0) && delta.amount1() > 0) {
            uint256 amount = uint256(uint128(delta.amount1()));
            IERC20(key.currency1.tokenAddress()).approve(vault1, amount);
            IUserVault(vault1).deposit(amount, address(this));
        }

        return (BaseHook.afterAddLiquidity.selector, delta);
    }

    /**
     * @dev Check interest/yield before a swap and harvest if profitable.
     */
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        // Logic to check vault yield
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /**
     * @dev Donate harvested interest back to the pool LPs.
     */
    function afterSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) {
        address vault0 = assetToVault[key.currency0.tokenAddress()];
        address vault1 = assetToVault[key.currency1.tokenAddress()];

        // Periodic harvesting logic (simplified for Hackathon)
        // In a real scenario, we'd check if totalAssetsAccrued() > totalDeposited
        if (vault0 != address(0)) {
            uint256 currentAssets = IUserVault(vault0).totalAssets();
            uint256 accruedAssets = IUserVault(vault0).totalAssetsAccrued();
            
            if (accruedAssets > currentAssets) {
                uint256 yield = accruedAssets - currentAssets;
                // Harvest interest
                IUserVault(vault0).withdraw(yield, address(this), address(this));
                // Donate to pool
                poolManager.donate(key, yield, 0, "");
            }
        }

        if (vault1 != address(0)) {
            uint256 currentAssets = IUserVault(vault1).totalAssets();
            uint256 accruedAssets = IUserVault(vault1).totalAssetsAccrued();
            
            if (accruedAssets > currentAssets) {
                uint256 yield = accruedAssets - currentAssets;
                // Harvest interest
                IUserVault(vault1).withdraw(yield, address(this), address(this));
                // Donate to pool
                poolManager.donate(key, 0, yield, "");
            }
        }

        return (BaseHook.afterSwap.selector, 0);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function setVaultForAsset(address asset, address vault) external {
        // Admin logic
        assetToVault[asset] = vault;
    }
}
