// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IWalletVerifier} from "../interfaces/IWalletVerifier.sol";

interface ISafeView {
    function masterCopy() external view returns (address);
    function getOwners() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function isOwner(address owner) external view returns (bool);
    function nonce() external view returns (uint256);
    function getModulesPaginated(address start, uint256 pageSize)
        external view returns (address[] memory array, address next);
    function getStorageAt(uint256 offset, uint256 length) external view returns (bytes memory);
}

interface ISafeAdmin {
    function execTransactionFromModule(address to, uint256 value, bytes calldata data, uint8 operation)
        external returns (bool success);
    function addOwnerWithThreshold(address owner, uint256 threshold) external;
    function removeOwner(address prevOwner, address owner, uint256 threshold) external;
    function changeThreshold(uint256 threshold) external;
    function disableModule(address prevModule, address module) external;
}

/**
 * @title SafeWalletVerifier
 * @notice Kiểm tra ví Safe 1.3.0 / 1.4.1 / 1.5.0. Mỗi điều kiện chưa đạt là một bit trong failMask.
 */
contract SafeWalletVerifier is IWalletVerifier {
    uint256 public constant NOT_OFFICIAL_SAFE  = 1 << 0;
    uint256 public constant OWNERS_MISMATCH    = 1 << 1;
    uint256 public constant THRESHOLD_MISMATCH = 1 << 2;
    uint256 public constant MODULES_ENABLED    = 1 << 3;
    uint256 public constant GUARD_SET          = 1 << 4;
    uint256 public constant MODULE_GUARD_SET   = 1 << 5;
    uint256 public constant FALLBACK_HANDLER   = 1 << 6;
    uint256 public constant EXECUTOR_NOT_ENABLED = 1 << 7;

    // đọc 2 module là đủ biết ví có module nào khác ngoài escrow không
    uint256 internal constant MODULE_PAGE = 2;

    bytes32 internal constant GUARD_SLOT            = keccak256("guard_manager.guard.address");
    bytes32 internal constant MODULE_GUARD_SLOT     = keccak256("module_manager.module_guard.address");
    bytes32 internal constant FALLBACK_HANDLER_SLOT = keccak256("fallback_manager.handler.address");
    address internal constant SENTINEL = address(0x1);

    mapping(address => bool) public isOfficialSingleton;

    constructor(address[] memory officialSingletons) {
        for (uint256 i = 0; i < officialSingletons.length; i++) {
            isOfficialSingleton[officialSingletons[i]] = true;
        }
    }

    function isSupportedWallet(address wallet) public view returns (bool) {
        if (wallet.code.length == 0) return false;
        // proxy tự trả lời masterCopy() từ slot 0, singleton giả không can thiệp được
        try ISafeView(wallet).masterCopy() returns (address mc) {
            return isOfficialSingleton[mc];
        } catch {
            return false;
        }
    }

    function isController(address wallet, address account) external view returns (bool) {
        if (wallet.code.length == 0) return false;
        try ISafeView(wallet).isOwner(account) returns (bool ok) { return ok; } catch { return false; }
    }

    function txNonce(address wallet) external view returns (uint256) {
        if (wallet.code.length == 0) return 0;
        try ISafeView(wallet).nonce() returns (uint256 n) { return n; } catch { return 0; }
    }

    function checkHandover(
        address wallet,
        address[] calldata newOwners,
        uint256 threshold,
        address allowedFallbackHandler
    ) external view returns (uint256 failMask) {
        // singleton lạ thì các hàm view khác đều không đáng tin
        if (!isSupportedWallet(wallet)) return NOT_OFFICIAL_SAFE;

        ISafeView safe = ISafeView(wallet);

        try safe.getOwners() returns (address[] memory owners) {
            if (!_sameSet(owners, newOwners)) failMask |= OWNERS_MISMATCH;
        } catch {
            failMask |= OWNERS_MISMATCH;
        }

        try safe.getThreshold() returns (uint256 t) {
            if (t != threshold) failMask |= THRESHOLD_MISMATCH;
        } catch {
            failMask |= THRESHOLD_MISMATCH;
        }

        try safe.getModulesPaginated(SENTINEL, 1) returns (address[] memory modules, address) {
            if (modules.length != 0) failMask |= MODULES_ENABLED;
        } catch {
            failMask |= MODULES_ENABLED;
        }

        failMask |= _checkHooks(safe, allowedFallbackHandler);
    }

    // owner và ngưỡng chưa cần đúng ở bước này, escrow sẽ đặt lại khi bàn giao
    function checkReadiness(address wallet, address executor, address allowedFallbackHandler)
        external view returns (uint256 failMask)
    {
        if (!isSupportedWallet(wallet)) return NOT_OFFICIAL_SAFE;
        ISafeView safe = ISafeView(wallet);

        try safe.getModulesPaginated(SENTINEL, MODULE_PAGE) returns (address[] memory modules, address) {
            bool hasExecutor = false;
            for (uint256 i = 0; i < modules.length; i++) {
                if (modules[i] == executor) hasExecutor = true;
                else failMask |= MODULES_ENABLED;
            }
            if (!hasExecutor) failMask |= EXECUTOR_NOT_ENABLED;
        } catch {
            failMask |= MODULES_ENABLED | EXECUTOR_NOT_ENABLED;
        }

        failMask |= _checkHooks(safe, allowedFallbackHandler);
    }

    // addOwner chèn owner mới vào đầu danh sách liên kết, nên owner cũ cần xóa luôn đứng ngay sau newOwners[0].
    // escrow là module duy nhất nên prevModule là SENTINEL.
    function handoverCalls(address wallet, address[] calldata newOwners, uint256 threshold, address executor)
        external view returns (bytes[] memory calls)
    {
        address[] memory oldOwners = ISafeView(wallet).getOwners();
        uint256 n = newOwners.length;
        calls = new bytes[](n + oldOwners.length + 2);
        uint256 k = 0;
        for (uint256 i = 0; i < n; i++) {
            calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.addOwnerWithThreshold, (newOwners[i], 1)));
        }
        for (uint256 j = 0; j < oldOwners.length; j++) {
            calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.removeOwner, (newOwners[0], oldOwners[j], 1)));
        }
        calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.changeThreshold, (threshold)));
        calls[k++] = _moduleCall(wallet, abi.encodeCall(ISafeAdmin.disableModule, (SENTINEL, executor)));
    }

    // guard, module guard và fallback handler không có getter nên đọc thẳng storage slot
    function _checkHooks(ISafeView safe, address allowedFallbackHandler) internal view returns (uint256 failMask) {
        (bool okGuard, address guard) = _readAddress(safe, GUARD_SLOT);
        if (!okGuard || guard != address(0)) failMask |= GUARD_SET;

        (bool okModuleGuard, address moduleGuard) = _readAddress(safe, MODULE_GUARD_SLOT);
        if (!okModuleGuard || moduleGuard != address(0)) failMask |= MODULE_GUARD_SET;

        (bool okHandler, address handler) = _readAddress(safe, FALLBACK_HANDLER_SLOT);
        if (!okHandler || (handler != address(0) && handler != allowedFallbackHandler)) {
            failMask |= FALLBACK_HANDLER;
        }
    }

    function _moduleCall(address wallet, bytes memory data) internal pure returns (bytes memory) {
        return abi.encodeCall(ISafeAdmin.execTransactionFromModule, (wallet, 0, data, uint8(0)));
    }

    function _readAddress(ISafeView safe, bytes32 slot) internal view returns (bool ok, address value) {
        try safe.getStorageAt(uint256(slot), 1) returns (bytes memory data) {
            if (data.length != 32) return (false, address(0));
            uint256 word = abi.decode(data, (uint256));
            if (word >> 160 != 0) return (false, address(0));
            return (true, address(uint160(word)));
        } catch {
            return (false, address(0));
        }
    }

    // so hai chiều để không bị lừa bởi phần tử trùng
    function _sameSet(address[] memory actual, address[] calldata expected) internal pure returns (bool) {
        if (actual.length != expected.length) return false;
        for (uint256 i = 0; i < expected.length; i++) {
            if (!_containsMem(actual, expected[i])) return false;
        }
        for (uint256 i = 0; i < actual.length; i++) {
            if (!_containsCalldata(expected, actual[i])) return false;
        }
        return true;
    }

    function _containsMem(address[] memory list, address item) internal pure returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) return true;
        }
        return false;
    }

    function _containsCalldata(address[] calldata list, address item) internal pure returns (bool) {
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == item) return true;
        }
        return false;
    }
}
