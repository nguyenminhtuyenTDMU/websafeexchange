// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Mỗi loại ví đa chữ ký có một verifier riêng cài interface này.
interface IWalletVerifier {
    function isSupportedWallet(address wallet) external view returns (bool);

    function isController(address wallet, address account) external view returns (bool);

    /// @notice Phải tăng trước khi ví chạy giao dịch của owner (escrow dựa vào điều này).
    function txNonce(address wallet) external view returns (uint256);

    /// @notice 0 khi `executor` là bên duy nhất được ví ủy quyền và ví không còn guard/hook lạ.
    function checkReadiness(address wallet, address executor, address allowedFallbackHandler)
        external view returns (uint256 failMask);

    /// @notice Các lời gọi escrow gửi tới ví để đổi sang `newOwners` rồi tự gỡ quyền của mình.
    function handoverCalls(address wallet, address[] calldata newOwners, uint256 threshold, address executor)
        external view returns (bytes[] memory calls);

    /// @notice 0 khi ví đã bàn giao sạch.
    function checkHandover(
        address wallet,
        address[] calldata newOwners,
        uint256 threshold,
        address allowedFallbackHandler
    ) external view returns (uint256 failMask);
}
