// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockCompoundToken (cToken)
 * @dev Mocks Compound v2 cToken behavior for testing UserVault
 */
contract MockCompoundToken is ERC20 {
    IERC20 public underlying;
    uint256 public exchangeRate = 1e18; // 1:1 initially

    constructor(address _underlying) ERC20("Compound USD", "cUSD") {
        underlying = IERC20(_underlying);
    }

    /**
     * @dev Sender supplies assets into the market and receives cTokens in exchange.
     * @return 0 on success, otherwise an error code
     */
    function mint(uint256 mintAmount) external returns (uint256) {
        // Transfer underlying from sender to this contract
        bool success = underlying.transferFrom(msg.sender, address(this), mintAmount);
        require(success, "Transfer failed");

        // Mint cTokens to sender (1:1 for simplicity in mock)
        _mint(msg.sender, mintAmount);

        return 0; // Success
    }

    /**
     * @dev Sender redeems cTokens in exchange for a specified amount of underlying asset.
     * @return 0 on success, otherwise an error code
     */
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
        // Check if contract has enough underlying
        require(underlying.balanceOf(address(this)) >= redeemAmount, "Insufficient liquidity");

        // Burn cTokens (1:1 for simplicity)
        _burn(msg.sender, redeemAmount);

        // Transfer underlying to sender
        bool success = underlying.transfer(msg.sender, redeemAmount);
        require(success, "Transfer failed");

        return 0; // Success
    }

    /**
     * @dev Get the underlying balance of the `owner`.
     * @notice This accumulates interest in real Compound, but here it's simple.
     */
    function balanceOfUnderlying(address owner) external view returns (uint256) {
        return balanceOf(owner); // 1:1 mapping for mock
    }
}
