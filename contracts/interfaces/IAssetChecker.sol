// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAssetChecker
 * @notice Trục 2 của kiến trúc: kiểm tra MỘT LOẠI TÀI SẢN / QUYỀN KIỂM SOÁT mà ví đang nắm giữ.
 *         Mỗi loại tài sản (ETH, ERC-20, ERC-721, Ownable, ...) có một checker riêng.
 */
interface IAssetChecker {
    /// @notice true nếu `wallet` đang nắm giữ tài sản (`token`, `value`) đúng như đã khai báo.
    function holds(address wallet, address token, uint256 value) external view returns (bool);
}
