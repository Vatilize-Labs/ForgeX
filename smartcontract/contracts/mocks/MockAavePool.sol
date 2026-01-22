// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IPool.sol";

/**
 * @title MockAavePool
 * @dev Mocks Aave V3 Pool behavior for testing UserVault
 */
contract MockAavePool is IPool {
    mapping(address => address) public reserves;

    function setReserve(address asset, address aToken) external {
        reserves[asset] = aToken;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /*referralCode*/
    ) external override {
        address aToken = reserves[asset];
        require(aToken != address(0), "Reserve not set");

        // Transfer underlying from sender to aToken contract
        IERC20(asset).transferFrom(msg.sender, aToken, amount);

        // Mint aTokens to onBehalfOf
        MockAToken(aToken).mint(onBehalfOf, amount);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        address aToken = reserves[asset];
        require(aToken != address(0), "Reserve not set");

        // Burn aTokens from sender
        MockAToken(aToken).burn(msg.sender, amount);

        // Transfer underlying to receiver
        MockAToken(aToken).withdrawUnderlying(to, amount);

        return amount;
    }

    function getUserAccountData(address /*user*/)
        external
        pure
        override
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (0, 0, 0, 0, 0, 0);
    }
}

/**
 * @title MockAToken
 * @dev Mocks Aave V3 aToken behavior
 */
contract MockAToken is ERC20 {
    address public immutable underlying;

    constructor(address _underlying) ERC20("Aave Mock aToken", "aMock") {
        underlying = _underlying;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }

    function withdrawUnderlying(address to, uint256 amount) external {
        IERC20(underlying).transfer(to, amount);
    }
}
