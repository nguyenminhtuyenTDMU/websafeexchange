// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAssetChecker} from "../interfaces/IAssetChecker.sol";

interface IERC20Balance { function balanceOf(address account) external view returns (uint256); }
interface IERC721Owner  { function ownerOf(uint256 tokenId) external view returns (address); }
interface IOwnableOwner { function owner() external view returns (address); }

// đọc lỗi thì trả về false

/// @notice Số dư ETH của ví >= value.
contract EthBalanceChecker is IAssetChecker {
    function holds(address wallet, address, uint256 value) external view returns (bool) {
        return wallet.balance >= value;
    }
}

/// @notice ERC-20: balanceOf(wallet) >= value.
contract Erc20BalanceChecker is IAssetChecker {
    function holds(address wallet, address token, uint256 value) external view returns (bool) {
        if (token.code.length == 0) return false;
        try IERC20Balance(token).balanceOf(wallet) returns (uint256 balance) {
            return balance >= value;
        } catch {
            return false;
        }
    }
}

/// @notice ERC-721: value là tokenId.
contract Erc721OwnerChecker is IAssetChecker {
    function holds(address wallet, address token, uint256 value) external view returns (bool) {
        if (token.code.length == 0) return false;
        try IERC721Owner(token).ownerOf(value) returns (address holder) {
            return holder == wallet;
        } catch {
            return false;
        }
    }
}

/// @notice owner() của hợp đồng `token` là ví.
contract OwnableOwnerChecker is IAssetChecker {
    function holds(address wallet, address token, uint256) external view returns (bool) {
        if (token.code.length == 0) return false;
        try IOwnableOwner(token).owner() returns (address currentOwner) {
            return currentOwner == wallet;
        } catch {
            return false;
        }
    }
}
