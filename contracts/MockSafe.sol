// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MockSafe {
    address public guardAddress;
    address[] public owners;
    mapping(address => bool) public isOwnerMapping;

    constructor(address _guard, address[] memory _owners) {
        guardAddress = _guard;
        for (uint i = 0; i < _owners.length; i++) {
            owners.push(_owners[i]);
            isOwnerMapping[_owners[i]] = true;
        }
    }

    function getGuard() external view returns (address) {
        return guardAddress;
    }

    function isOwner(address owner) external view returns (bool) {
        return isOwnerMapping[owner];
    }

    function setGuard(address _guard) external {
        guardAddress = _guard;
    }

    function addOwner(address owner) external {
        if (!isOwnerMapping[owner]) {
            owners.push(owner);
            isOwnerMapping[owner] = true;
        }
    }

    function removeOwner(address owner) external {
        isOwnerMapping[owner] = false;
    }

    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    receive() external payable {}
}
