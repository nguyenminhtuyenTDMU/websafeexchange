// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Chỉ dùng trong Remix để thao tác với một Safe có sẵn qua "At Address" — KHÔNG deploy file này.
 *
 * 1. Compile file này, chọn ISafeForRemix ở ô CONTRACT, dán địa chỉ Safe vào "At Address".
 * 2. Owner duy nhất (Safe 1-of-1) gọi execTransaction trực tiếp từ MetaMask với chữ ký kiểu
 *    "approved by msg.sender" (v = 1):
 *      signatures = 0x000000000000000000000000<địa chỉ owner, 40 ký tự hex, bỏ 0x>
 *                     0000000000000000000000000000000000000000000000000000000000000000
 *                     01
 *    (viết liền một dòng; tổng 65 byte = 130 ký tự hex sau 0x)
 * 3. Dùng SafeCalldata.enableModuleData(escrow) (hàm pure, gọi miễn phí) để lấy `data`.
 */
interface ISafeForRemix {
    function execTransaction(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation,
        uint256 safeTxGas,
        uint256 baseGas,
        uint256 gasPrice,
        address gasToken,
        address refundReceiver,
        bytes calldata signatures
    ) external payable returns (bool success);

    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function nonce() external view returns (uint256);
    function isModuleEnabled(address module) external view returns (bool);
    function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] memory, address);
}

/// @notice Tiện ích tạo calldata và chữ ký; deploy lên Remix VM (không tốn phí) hoặc Sepolia đều được.
contract SafeCalldata {
    function enableModuleData(address module) external pure returns (bytes memory) {
        return abi.encodeWithSignature("enableModule(address)", module);
    }

    function disableModuleData(address prevModule, address module) external pure returns (bytes memory) {
        return abi.encodeWithSignature("disableModule(address,address)", prevModule, module);
    }

    function setGuardData(address guard) external pure returns (bytes memory) {
        return abi.encodeWithSignature("setGuard(address)", guard);
    }

    function setFallbackHandlerData(address handler) external pure returns (bytes memory) {
        return abi.encodeWithSignature("setFallbackHandler(address)", handler);
    }

    /// @notice Chữ ký "approved by msg.sender" cho owner gửi giao dịch trực tiếp.
    function ownerSignature(address owner) external pure returns (bytes memory) {
        return abi.encodePacked(bytes32(uint256(uint160(owner))), bytes32(0), uint8(1));
    }
}
