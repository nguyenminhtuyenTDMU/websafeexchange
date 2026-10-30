// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAssetChecker} from "../interfaces/IAssetChecker.sol";

interface IERC20Balance { function balanceOf(address account) external view returns (uint256); }
interface IERC721Owner  { function ownerOf(uint256 tokenId) external view returns (address); }
interface IOwnableOwner { function owner() external view returns (address); }

/*
 * Bốn checker tham chiếu cho trục tài sản. Mọi lỗi đọc dữ liệu đều trả về false (fail-closed).
 *
 * Giới hạn đã biết của phương pháp đối chiếu số dư:
 *  - token rebase / token thu phí khi chuyển có số dư tự thay đổi => không áp dụng được;
 *  - số tài sản khai báo bị giới hạn (MAX_ASSETS trong escrow) do gas tăng tuyến tính.
 */

/// @notice ETH: số dư ví >= value. Tham số token bị bỏ qua.
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

/// @notice ERC-721: ownerOf(value) == wallet, với value là tokenId.
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

/// @notice Ownable: owner() của hợp đồng `token` == wallet. Tham số value bị bỏ qua.
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
