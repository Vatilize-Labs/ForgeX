// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IERC4626.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title UserVault
 * @dev ERC-4626 compliant tokenized vault for SmartX platform
 * @notice This contract allows users to deposit assets and receive vault shares
 * @dev Implements the ERC-4626 standard for tokenized vaults
 */
contract UserVault is ERC20, IERC4626, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev The underlying asset token
    IERC20 private immutable _asset;

    /// @dev Reference to the VaultFactory contract
    address private immutable _factory;

    /// @dev Reference to the Chainlink Price Feed
    AggregatorV3Interface private immutable _priceFeed;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize the vault
     * @param asset_ The address of the underlying asset token
     * @param owner_ The address of the vault owner
     * @param factory_ The address of the VaultFactory contract
     * @param name_ The name of the vault share token
     * @param symbol_ The symbol of the vault share token
     */
    constructor(
        address asset_,
        address owner_,
        address factory_,
        string memory name_,
        string memory symbol_,
        address priceFeed_
    ) ERC20(name_, symbol_) Ownable(owner_) {
        require(asset_ != address(0), "UserVault: asset is zero address");
        require(factory_ != address(0), "UserVault: factory is zero address");
        require(priceFeed_ != address(0), "UserVault: price feed is zero address");
        
        _asset = IERC20(asset_);
        _factory = factory_;
        _priceFeed = AggregatorV3Interface(priceFeed_);
    }

    /*//////////////////////////////////////////////////////////////
                        ASSET INFORMATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IERC4626
     */
    function asset() external view override returns (address) {
        return address(_asset);
    }

    /**
     * @inheritdoc IERC4626
     */
    function totalAssets() public view override returns (uint256) {
        return _asset.balanceOf(address(this));
    }

    /**
     * @dev Returns the factory address
     * @return The address of the VaultFactory contract
     */
    function factory() external view returns (address) {
        return _factory;
    }

    /*//////////////////////////////////////////////////////////////
                    DEPOSIT/WITHDRAWAL LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IERC4626
     */
    function deposit(uint256 assets, address receiver) 
        external 
        override 
        returns (uint256 shares) 
    {
        require(assets > 0, "UserVault: cannot deposit 0");
        require(receiver != address(0), "UserVault: receiver is zero address");

        // Calculate shares to mint
        shares = previewDeposit(assets);
        require(shares > 0, "UserVault: zero shares");

        // Transfer assets from caller to vault
        _asset.safeTransferFrom(msg.sender, address(this), assets);

        // Mint shares to receiver
        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @inheritdoc IERC4626
     */
    function mint(uint256 shares, address receiver) 
        external 
        override 
        returns (uint256 assets) 
    {
        require(shares > 0, "UserVault: cannot mint 0");
        require(receiver != address(0), "UserVault: receiver is zero address");

        // Calculate assets required
        assets = previewMint(shares);
        require(assets > 0, "UserVault: zero assets");

        // Transfer assets from caller to vault
        _asset.safeTransferFrom(msg.sender, address(this), assets);

        // Mint shares to receiver
        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /**
     * @inheritdoc IERC4626
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) external override returns (uint256 shares) {
        require(assets > 0, "UserVault: cannot withdraw 0");
        require(receiver != address(0), "UserVault: receiver is zero address");
        require(owner != address(0), "UserVault: owner is zero address");

        // Calculate shares to burn
        shares = previewWithdraw(assets);
        require(shares > 0, "UserVault: zero shares");

        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            require(allowed >= shares, "UserVault: insufficient allowance");
            _approve(owner, msg.sender, allowed - shares);
        }

        // Burn shares from owner
        _burn(owner, shares);

        // Transfer assets to receiver
        _asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /**
     * @inheritdoc IERC4626
     */
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) external override returns (uint256 assets) {
        require(shares > 0, "UserVault: cannot redeem 0");
        require(receiver != address(0), "UserVault: receiver is zero address");
        require(owner != address(0), "UserVault: owner is zero address");

        // Calculate assets to withdraw
        assets = previewRedeem(shares);
        require(assets > 0, "UserVault: zero assets");

        // Check allowance if caller is not owner
        if (msg.sender != owner) {
            uint256 allowed = allowance(owner, msg.sender);
            require(allowed >= shares, "UserVault: insufficient allowance");
            _approve(owner, msg.sender, allowed - shares);
        }

        // Burn shares from owner
        _burn(owner, shares);

        // Transfer assets to receiver
        _asset.safeTransfer(receiver, assets);

        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /*//////////////////////////////////////////////////////////////
                        ACCOUNTING LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IERC4626
     */
    function convertToShares(uint256 assets) public view override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /**
     * @inheritdoc IERC4626
     */
    function convertToAssets(uint256 shares) public view override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /**
     * @inheritdoc IERC4626
     */
    function maxDeposit(address) external pure override returns (uint256) {
        return type(uint256).max;
    }

    /**
     * @inheritdoc IERC4626
     */
    function maxMint(address) external pure override returns (uint256) {
        return type(uint256).max;
    }

    /**
     * @inheritdoc IERC4626
     */
    function maxWithdraw(address owner) external view override returns (uint256) {
        return _convertToAssets(balanceOf(owner), Math.Rounding.Floor);
    }

    /**
     * @inheritdoc IERC4626
     */
    function maxRedeem(address owner) external view override returns (uint256) {
        return balanceOf(owner);
    }

    /**
     * @inheritdoc IERC4626
     */
    function previewDeposit(uint256 assets) public view override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Floor);
    }

    /**
     * @inheritdoc IERC4626
     */
    function previewMint(uint256 shares) public view override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Ceil);
    }

    /**
     * @inheritdoc IERC4626
     */
    function previewWithdraw(uint256 assets) public view override returns (uint256) {
        return _convertToShares(assets, Math.Rounding.Ceil);
    }

    /**
     * @inheritdoc IERC4626
     */
    function previewRedeem(uint256 shares) public view override returns (uint256) {
        return _convertToAssets(shares, Math.Rounding.Floor);
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Internal function to convert assets to shares
     * @param assets The amount of assets to convert
     * @param rounding The rounding direction
     * @return shares The equivalent amount of shares
     */
    function _convertToShares(uint256 assets, Math.Rounding rounding) 
        internal 
        view 
        returns (uint256 shares) 
    {
        uint256 supply = totalSupply();
        
        // First deposit: 1:1 ratio
        if (supply == 0) {
            shares = assets;
        } else {
            // Subsequent deposits: proportional to total assets
            uint256 totalAssets_ = totalAssets();
            shares = assets.mulDiv(supply, totalAssets_, rounding);
        }
    }

    /**
     * @dev Internal function to convert shares to assets
     * @param shares The amount of shares to convert
     * @param rounding The rounding direction
     * @return assets The equivalent amount of assets
     */
    function _convertToAssets(uint256 shares, Math.Rounding rounding) 
        internal 
        view 
        returns (uint256 assets) 
    {
        uint256 supply = totalSupply();
        
        // If no shares exist, return 0
        if (supply == 0) {
            assets = 0;
        } else {
            // Calculate proportional assets
            uint256 totalAssets_ = totalAssets();
            assets = shares.mulDiv(totalAssets_, supply, rounding);
        }
    }
}
