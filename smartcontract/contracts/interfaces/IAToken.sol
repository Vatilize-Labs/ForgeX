// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IAToken
 * @dev Interface for Aave V3 aToken contract
 */
interface IAToken is IERC20 {
    /**
     * @notice Returns the address of the underlying asset of this aToken
     * @return address The address of the underlying asset
     */
    function UNDERLYING_ASSET_ADDRESS() external view returns (address);
}
