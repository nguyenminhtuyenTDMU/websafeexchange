// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IWalletVerifier
 * @notice Trục 1 của kiến trúc: xác minh trạng thái quyền kiểm soát của MỘT LOẠI VÍ đa chữ ký.
 *         Mỗi loại ví (Safe, ...) có một adapter riêng cài đặt interface này.
 */
interface IWalletVerifier {
    /// @notice Ví có phải loại ví mà adapter này hỗ trợ (vd: Safe chính thức) hay không.
    function isSupportedWallet(address wallet) external view returns (bool);

    /// @notice `account` có đang nắm quyền kiểm soát `wallet` (là owner) hay không.
    function isController(address wallet, address account) external view returns (bool);

    /// @notice Bộ đếm giao dịch của ví, dùng để phát hiện hoạt động bất thường.
    function txNonce(address wallet) external view returns (uint256);

    /**
     * @notice Kiểm tra trạng thái "bàn giao sạch".
     * @return failMask 0 nếu sạch; ngược lại mỗi bit là một điều kiện chưa đạt (xem adapter).
     */
    function checkHandover(
        address wallet,
        address[] calldata newOwners,
        uint256 threshold,
        address allowedFallbackHandler
    ) external view returns (uint256 failMask);
}
