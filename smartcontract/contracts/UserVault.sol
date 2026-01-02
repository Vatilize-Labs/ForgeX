// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IERC4626.sol";
import "./interfaces/ICToken.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

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

    /// @dev Mapping of protocol names to allocated amounts
    mapping(string => uint256) private protocolAllocations;

    /// @dev Array of protocol names for iteration
    string[] private protocolNames;

    /// @dev Amount of assets currently deposited in Compound
    uint256 private compoundDeposited;

    /// @dev Pause state of the vault
    bool private _paused;

    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when protocol name is empty
    error InvalidProtocolName();

    /// @dev Thrown when total allocations exceed vault balance
    error AllocationExceedsBalance();

    /// @dev Thrown when amount is invalid
    error InvalidAmount();

    /// @dev Thrown when protocol address is not set
    error ProtocolAddressNotSet();

    /// @dev Thrown when Compound operation fails
    error CompoundOperationFailed();

    /// @dev Thrown when insufficient balance for operation
    error InsufficientBalance();

    /// @dev Thrown when operation is attempted while vault is paused
    error VaultPaused();

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when protocol allocation is changed
     * @param protocol The name of the protocol
     * @param oldAmount The previous allocation amount
     * @param newAmount The new allocation amount
     */
    event ProtocolAllocationChanged(string indexed protocol, uint256 oldAmount, uint256 newAmount);

    /**
     * @dev Emitted when assets are deployed to a protocol
     * @param protocol The name of the protocol
     * @param amount The amount deployed
     */
    event ProtocolDeployed(string indexed protocol, uint256 amount);

    /**
     * @dev Emitted when assets are withdrawn from a protocol
     * @param protocol The name of the protocol
     * @param amount The amount withdrawn
     */
    event ProtocolWithdrawn(string indexed protocol, uint256 amount);

    /**
     * @dev Emitted when vault is paused
     * @param vault The address of the vault
     * @param pausedBy The address that paused the vault
     */
    event VaultPaused(address indexed vault, address indexed pausedBy);

    /**
     * @dev Emitted when vault is unpaused
     * @param vault The address of the vault
     * @param unpausedBy The address that unpaused the vault
     */
    event VaultUnpaused(address indexed vault, address indexed unpausedBy);

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
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Modifier to make a function callable only when the vault is not paused
     */
    modifier whenNotPaused() {
        if (_paused) revert VaultPaused();
        _;
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
        // Return vault balance + estimated Compound balance
        // Note: We use compoundDeposited as an estimate since balanceOfUnderlying() is not view
        return _asset.balanceOf(address(this)) + compoundDeposited;
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
    ) external override whenNotPaused returns (uint256 shares) {
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
    ) external override whenNotPaused returns (uint256 assets) {
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
                        PRICE FEED LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the current asset price in USD from Chainlink
     * @return price The price of 1 asset unit in USD (with 18 decimals)
     */
    function getAssetPriceUSD() public view returns (uint256) {
        (, int256 price,,,) = _priceFeed.latestRoundData();
        require(price > 0, "UserVault: invalid price");
        
        uint8 feedDecimals = _priceFeed.decimals();
        return uint256(price) * 10**(18 - feedDecimals);
    }

    /**
     * @dev Returns the total vault value in USD
     * @return value The total value in USD (with 18 decimals)
     */
    function getTotalValueUSD() public view returns (uint256) {
        uint256 totalAssets_ = totalAssets();
        uint256 price = getAssetPriceUSD();
        
        // Both are 18 decimals, so result is 36 decimals. Divide by 1e18 to get 18 decimals.
        return (totalAssets_ * price) / 1e18;
    }

    /**
     * @dev Returns the price per share in USD
     * @return price The price of 1 share in USD (with 18 decimals)
     */
    function getSharePriceUSD() public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) return getAssetPriceUSD(); // Initial share price equals asset price
        
        return getTotalValueUSD().mulDiv(1e18, supply);
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
        
        // If no shares exist, 1:1 ratio
        if (supply == 0) {
            assets = shares;
        } else {
            // Calculate proportional assets
            uint256 totalAssets_ = totalAssets();
            assets = shares.mulDiv(totalAssets_, supply, rounding);
        }
    }

    /*//////////////////////////////////////////////////////////////
                    PROTOCOL ALLOCATION MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Set allocation for a specific protocol
     * @param protocol The name of the protocol
     * @param amount The amount to allocate
     */
    function setProtocolAllocation(string memory protocol, uint256 amount) external onlyOwner {
        if (bytes(protocol).length == 0) revert InvalidProtocolName();
        
        uint256 oldAmount = protocolAllocations[protocol];
        
        // Calculate new total allocation
        uint256 currentTotal = getTotalAllocated();
        uint256 newTotal = currentTotal - oldAmount + amount;
        
        // Validate total allocations don't exceed total assets
        if (newTotal > totalAssets()) revert AllocationExceedsBalance();
        
        // Update allocation
        protocolAllocations[protocol] = amount;
        
        // Add protocol to array if it's new and amount > 0
        if (oldAmount == 0 && amount > 0) {
            protocolNames.push(protocol);
        }
        
        // Remove protocol from array if amount is now 0
        if (amount == 0 && oldAmount > 0) {
            _removeProtocolName(protocol);
        }
        
        emit ProtocolAllocationChanged(protocol, oldAmount, amount);
    }

    /**
     * @dev Get allocation for a specific protocol
     * @param protocol The name of the protocol
     * @return The allocated amount
     */
    function getProtocolAllocation(string memory protocol) external view returns (uint256) {
        return protocolAllocations[protocol];
    }

    /**
     * @dev Get total allocated amount across all protocols
     * @return The total allocated amount
     */
    function getTotalAllocated() public view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < protocolNames.length; i++) {
            total += protocolAllocations[protocolNames[i]];
        }
        return total;
    }

    /**
     * @dev Get all protocol allocations
     * @return protocols Array of protocol names
     * @return amounts Array of corresponding allocation amounts
     */
    function getAllProtocolAllocations() external view returns (string[] memory protocols, uint256[] memory amounts) {
        protocols = new string[](protocolNames.length);
        amounts = new uint256[](protocolNames.length);
        
        for (uint256 i = 0; i < protocolNames.length; i++) {
            protocols[i] = protocolNames[i];
            amounts[i] = protocolAllocations[protocolNames[i]];
        }
    }

    /**
     * @dev Internal function to remove a protocol name from the array
     * @param protocol The protocol name to remove
     */
    function _removeProtocolName(string memory protocol) private {
        for (uint256 i = 0; i < protocolNames.length; i++) {
            if (keccak256(bytes(protocolNames[i])) == keccak256(bytes(protocol))) {
                // Move the last element to this position and pop
                protocolNames[i] = protocolNames[protocolNames.length - 1];
                protocolNames.pop();
                break;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        COMPOUND INTEGRATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Deploy assets to Compound protocol to earn interest
     * @dev Only the vault owner can call this function
     * @param amount The amount of assets to deploy to Compound
     */
    function deployToCompound(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        
        // Get Compound cToken address from factory
        address compoundAddress = IVaultFactory(_factory).getCompoundAddress();
        if (compoundAddress == address(0)) revert ProtocolAddressNotSet();
        
        // Check vault has sufficient balance
        uint256 availableBalance = _asset.balanceOf(address(this));
        if (amount > availableBalance) revert InsufficientBalance();
        
        // Approve cToken contract to spend assets
        _asset.safeIncreaseAllowance(compoundAddress, amount);
        
        // Supply assets to Compound
        ICToken cToken = ICToken(compoundAddress);
        uint256 result = cToken.mint(amount);
        
        // Check if mint was successful (Compound returns 0 on success)
        if (result != 0) revert CompoundOperationFailed();
        
        // Update tracking
        compoundDeposited += amount;
        
        // Emit event
        emit ProtocolDeployed("Compound", amount);
    }

    /**
     * @notice Withdraw assets from Compound protocol
     * @dev Only the vault owner can call this function
     * @param amount The amount of assets to withdraw from Compound
     */
    function withdrawFromCompound(uint256 amount) external onlyOwner {
        if (amount == 0) revert InvalidAmount();
        
        // Get Compound cToken address from factory
        address compoundAddress = IVaultFactory(_factory).getCompoundAddress();
        if (compoundAddress == address(0)) revert ProtocolAddressNotSet();
        
        // Check sufficient balance in Compound
        if (amount > compoundDeposited) revert InsufficientBalance();
        
        // Redeem underlying assets from Compound
        ICToken cToken = ICToken(compoundAddress);
        uint256 result = cToken.redeemUnderlying(amount);
        
        // Check if redeem was successful (Compound returns 0 on success)
        if (result != 0) revert CompoundOperationFailed();
        
        // Update tracking
        compoundDeposited -= amount;
        
        // Emit event
        emit ProtocolWithdrawn("Compound", amount);
    }

    /**
     * @notice Get the current balance of assets deposited in Compound
     * @dev This returns the actual balance from Compound, which may be higher due to accrued interest
     * @return The amount of underlying assets in Compound
     */
    function getCompoundBalance() public returns (uint256) {
        address compoundAddress = IVaultFactory(_factory).getCompoundAddress();
        if (compoundAddress == address(0)) return 0;
        
        ICToken cToken = ICToken(compoundAddress);
        return cToken.balanceOfUnderlying(address(this));
    }

    /*//////////////////////////////////////////////////////////////
                        PAUSE/UNPAUSE FUNCTIONALITY
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Pause the vault to prevent all critical operations
     * @dev Only the vault owner can pause. Emits VaultPaused event
     */
    function pause() external onlyOwner {
        if (_paused) revert VaultPaused();
        _paused = true;
        emit VaultPaused(address(this), msg.sender);
    }

    /**
     * @notice Unpause the vault to resume normal operations
     * @dev Only the vault owner can unpause. Emits VaultUnpaused event
     */
    function unpause() external onlyOwner {
        if (!_paused) revert VaultPaused();
        _paused = false;
        emit VaultUnpaused(address(this), msg.sender);
    }

    /**
     * @notice Check if the vault is currently paused
     * @return bool True if paused, false otherwise
     */
    function isPaused() external view returns (bool) {
        return _paused;
    }
}

/**
 * @dev Interface for VaultFactory to get protocol addresses
 */
interface IVaultFactory {
    function getCompoundAddress() external view returns (address);
}

