// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mỗi loại tài sản (ETH, ERC-20, ERC-721, Ownable) có một checker riêng.
interface IAssetChecker {
    function holds(address wallet, address token, uint256 value) external view returns (bool);
}
