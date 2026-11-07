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

    /**
     * @notice Bộ đếm giao dịch của ví. Phải tăng TRƯỚC khi ví thực thi bất kỳ giao dịch nào do owner ký,
     *         để escrow phát hiện được việc bị gọi từ bên trong một giao dịch của ví (xem finalizeHandover).
     */
    function txNonce(address wallet) external view returns (uint256);

    /**
     * @notice Ví đã sẵn sàng cho escrow (`executor`) thực hiện bàn giao chưa: `executor` là đơn vị thực thi
     *         DUY NHẤT được ví ủy quyền, và không còn cơ chế nào khác có thể tác động lên ví sau bàn giao.
     * @return failMask 0 nếu sẵn sàng; mỗi bit là một điều kiện chưa đạt (xem adapter).
     */
    function checkReadiness(address wallet, address executor, address allowedFallbackHandler)
        external view returns (uint256 failMask);

    /**
     * @notice Danh sách lời gọi (gửi tới `wallet`, do `executor` thực hiện) để chuyển quyền kiểm soát sang
     *         đúng tập `newOwners` với ngưỡng `threshold`, rồi thu hồi quyền của `executor`.
     *         Mỗi lời gọi phải không revert và trả về abi-encoded `true`.
     */
    function handoverCalls(address wallet, address[] calldata newOwners, uint256 threshold, address executor)
        external view returns (bytes[] memory calls);

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
