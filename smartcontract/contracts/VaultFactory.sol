// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VaultFactory
 * @dev Factory contract for creating and managing user vaults on SmartX platform
 * @notice This contract handles user registration and vault deployment
 */
contract VaultFactory is Ownable {
    /*//////////////////////////////////////////////////////////////
                            CUSTOM ERRORS
    //////////////////////////////////////////////////////////////*/

    /// @dev Thrown when user tries to register twice
    error AlreadyRegistered();

    /// @dev Thrown when querying data for unregistered user
    error NotRegistered();

    /// @dev Thrown when username exceeds maximum length
    error UsernameTooLong();

    /// @dev Thrown when bio exceeds maximum length
    error BioTooLong();

    /// @dev Thrown when username is empty
    error EmptyUsername();

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev Maximum allowed username length
    uint256 public constant MAX_USERNAME_LENGTH = 20;

    /// @dev Maximum allowed bio length
    uint256 public constant MAX_BIO_LENGTH = 30;

    /// @dev Mapping to track registered users
    mapping(address => bool) private registeredUsers;

    /// @dev Mapping to store usernames
    mapping(address => string) private userUsernames;

    /// @dev Mapping to store user bios
    mapping(address => string) private userBios;

    /// @dev Mapping to store registration timestamps
    mapping(address => uint256) private userRegistrationTimestamps;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a user registers
     * @param user The address of the registered user
     * @param username The username chosen by the user
     * @param timestamp The block timestamp of registration
     */
    event UserRegistered(
        address indexed user,
        string username,
        uint256 timestamp
    );

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize the factory
     * @param initialOwner The address of the initial owner
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /*//////////////////////////////////////////////////////////////
                        USER REGISTRATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Register a new user with username and bio
     * @param username The desired username (max 20 characters)
     * @param bio The user's bio (max 30 characters, can be empty)
     * @notice Users can only register once
     * @notice Username cannot be empty and must be within length limits
     */
    function registerUser(string calldata username, string calldata bio) external {
        // Check if user is already registered
        if (registeredUsers[msg.sender]) revert AlreadyRegistered();

        // Validate username
        if (bytes(username).length == 0) revert EmptyUsername();
        if (bytes(username).length > MAX_USERNAME_LENGTH) revert UsernameTooLong();

        // Validate bio (can be empty, but not too long)
        if (bytes(bio).length > MAX_BIO_LENGTH) revert BioTooLong();

        // Store user data
        registeredUsers[msg.sender] = true;
        userUsernames[msg.sender] = username;
        userBios[msg.sender] = bio;
        userRegistrationTimestamps[msg.sender] = block.timestamp;

        // Emit event
        emit UserRegistered(msg.sender, username, block.timestamp);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Check if a user is registered
     * @param user The address to check
     * @return bool True if user is registered, false otherwise
     */
    function isUserRegistered(address user) external view returns (bool) {
        return registeredUsers[user];
    }

    /**
     * @dev Get complete user information
     * @param user The address of the user
     * @return username The user's username
     * @return bio The user's bio
     * @return registrationTimestamp The timestamp when user registered
     * @notice Reverts if user is not registered
     */
    function getUserInfo(address user)
        external
        view
        returns (
            string memory username,
            string memory bio,
            uint256 registrationTimestamp
        )
    {
        if (!registeredUsers[user]) revert NotRegistered();

        return (
            userUsernames[user],
            userBios[user],
            userRegistrationTimestamps[user]
        );
    }

    /**
     * @dev Get username for a registered user
     * @param user The address of the user
     * @return The user's username
     * @notice Reverts if user is not registered
     */
    function getUsername(address user) external view returns (string memory) {
        if (!registeredUsers[user]) revert NotRegistered();
        return userUsernames[user];
    }

    /**
     * @dev Get bio for a registered user
     * @param user The address of the user
     * @return The user's bio
     * @notice Reverts if user is not registered
     */
    function getBio(address user) external view returns (string memory) {
        if (!registeredUsers[user]) revert NotRegistered();
        return userBios[user];
    }

    /**
     * @dev Get registration timestamp for a registered user
     * @param user The address of the user
     * @return The timestamp when user registered
     * @notice Reverts if user is not registered
     */
    function getRegistrationTimestamp(address user) external view returns (uint256) {
        if (!registeredUsers[user]) revert NotRegistered();
        return userRegistrationTimestamps[user];
    }
}
