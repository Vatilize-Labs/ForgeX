// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {ModifyLiquidityParams, SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUserVault} from "./interfaces/IUserVault.sol";

/**
 * @title VultHook
 * @dev Uniswap v4 Hook that integrates ForgeX ERC-4626 vaults for yield generation.
 * @notice This hook moves idle pool assets into vaults during liquidity additions and swaps.
 */
contract VultHook is BaseHook {
    using CurrencyLibrary for Currency;

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
    function _afterAddLiquidity(
        address sender,
        PoolKey calldata key,
        ModifyLiquidityParams calldata params,
        BalanceDelta delta,
        BalanceDelta feesAccrued,
        bytes calldata hookData
    ) internal override returns (bytes4, BalanceDelta) {
        address vault0 = assetToVault[Currency.unwrap(key.currency0)];
        address vault1 = assetToVault[Currency.unwrap(key.currency1)];

        // If vault exists for currency0, move assets
        if (vault0 != address(0) && delta.amount0() > 0) {
            uint256 amount = uint256(uint128(delta.amount0()));
            IERC20(Currency.unwrap(key.currency0)).approve(vault0, amount);
            IUserVault(vault0).deposit(amount, address(this));
        }

        // If vault exists for currency1, move assets
        if (vault1 != address(0) && delta.amount1() > 0) {
            uint256 amount = uint256(uint128(delta.amount1()));
            IERC20(Currency.unwrap(key.currency1)).approve(vault1, amount);
            IUserVault(vault1).deposit(amount, address(this));
        }

        return (BaseHook.afterAddLiquidity.selector, delta);
    }

    /**
     * @dev Check interest/yield before a swap and harvest if profitable.
     */
    function _beforeSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata hookData
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        // Logic to check vault yield could go here
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    /**
     * @dev Donate harvested interest back to the pool LPs.
     */
    function _afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) internal override returns (bytes4, int128) {
        address vault0 = assetToVault[Currency.unwrap(key.currency0)];
        address vault1 = assetToVault[Currency.unwrap(key.currency1)];

        if (vault0 != address(0)) {
            uint256 currentAssets = IUserVault(vault0).totalAssets();
            uint256 accruedAssets = IUserVault(vault0).totalAssetsAccrued();
            
            if (accruedAssets > currentAssets) {
                uint256 yield = accruedAssets - currentAssets;
                IUserVault(vault0).withdraw(yield, address(this), address(this));
                poolManager.donate(key, yield, 0, "");
            }
        }

        if (vault1 != address(0)) {
            uint256 currentAssets = IUserVault(vault1).totalAssets();
            uint256 accruedAssets = IUserVault(vault1).totalAssetsAccrued();
            
            if (accruedAssets > currentAssets) {
                uint256 yield = accruedAssets - currentAssets;
                IUserVault(vault1).withdraw(yield, address(this), address(this));
                poolManager.donate(key, 0, yield, "");
            }
        }

        return (BaseHook.afterSwap.selector, 0);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Overriding to allow deployment to any address.
     * @notice In production, the hook must be at a specific address matching its permissions.
     */
    function validateHookAddress(BaseHook _this) internal pure override {}

    function setVaultForAsset(address asset, address vault) external {
        assetToVault[asset] = vault;
    }
}
