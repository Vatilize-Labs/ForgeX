// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockVaultFactory {
    address public compoundAddress;

    constructor(address _compoundAddress) {
        compoundAddress = _compoundAddress;
    }

    function getCompoundAddress() external view returns (address) {
        return compoundAddress;
    }

    function setCompoundAddress(address _compoundAddress) external {
        compoundAddress = _compoundAddress;
    }
}
