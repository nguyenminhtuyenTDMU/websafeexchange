// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Hợp đồng chỉ dùng cho kiểm thử — KHÔNG triển khai lên mạng thật.

contract MockERC20 {
    mapping(address => uint256) public balanceOf;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockERC721 {
    mapping(uint256 => address) private _owners;

    function mint(address to, uint256 tokenId) external { _owners[tokenId] = to; }

    function ownerOf(uint256 tokenId) external view returns (address o) {
        o = _owners[tokenId];
        require(o != address(0), "nonexistent");
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from && msg.sender == from, "auth");
        _owners[tokenId] = to;
    }
}

contract MockOwnable {
    address public owner;

    constructor(address initialOwner) { owner = initialOwner; }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "owner");
        owner = newOwner;
    }
}

/// @dev Cùng selector với interface Guard của Safe 1.4.1 (Enum.Operation được mã hóa ABI là uint8).
interface ISafeGuardLike {
    function checkTransaction(
        address to, uint256 value, bytes calldata data, uint8 operation,
        uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken,
        address refundReceiver, bytes calldata signatures, address msgSender
    ) external;
    function checkAfterExecution(bytes32 txHash, bool success) external;
}

/// @notice Guard "cài cắm" của kẻ tấn công: hiện tại cho qua mọi giao dịch, nhưng có thể bị bật chặn bất cứ lúc nào.
contract MockGuard is ISafeGuardLike {
    function checkTransaction(
        address, uint256, bytes calldata, uint8, uint256, uint256, uint256, address, address, bytes calldata, address
    ) external pure {}

    function checkAfterExecution(bytes32, bool) external pure {}

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == type(ISafeGuardLike).interfaceId || interfaceId == 0x01ffc9a7;
    }
}

/// @notice Được Safe delegatecall tới để ghi đè slot 0 (địa chỉ singleton) => thay "bộ não" của ví.
contract SingletonSwitcher {
    function switchTo(address newSingleton) external {
        assembly { sstore(0, newSingleton) }
    }
}

/// @notice Singleton giả mạo: mọi hàm view đều "khai" rằng ví đã bàn giao sạch cho `fakeOwner`.
contract FakeSafeSingleton {
    address public immutable fakeOwner;

    constructor(address owner_) { fakeOwner = owner_; }

    function getOwners() external view returns (address[] memory owners) {
        owners = new address[](1);
        owners[0] = fakeOwner;
    }
    function getThreshold() external pure returns (uint256) { return 1; }
    function isOwner(address a) external view returns (bool) { return a == fakeOwner; }
    function nonce() external pure returns (uint256) { return 0; }
    function getModulesPaginated(address, uint256) external pure returns (address[] memory array, address next) {
        array = new address[](0);
        next = address(1);
    }
    function getStorageAt(uint256, uint256) external pure returns (bytes memory) { return new bytes(32); }
}
