/**
 * ABI cho SafeExchangeEscrow
 * Sync với contracts/SafeExchangeEscrowSoftGuard.sol
 */
export declare const escrowABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint64";
        readonly name: "deadline";
        readonly type: "uint64";
    }];
    readonly name: "armTrade";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "id";
        readonly type: "bytes32";
    }];
    readonly name: "deposit";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "id";
        readonly type: "bytes32";
    }];
    readonly name: "releaseFunds";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "id";
        readonly type: "bytes32";
    }];
    readonly name: "buyerRequestCancel";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "id";
        readonly type: "bytes32";
    }];
    readonly name: "cancelTimeout";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "id";
        readonly type: "bytes32";
    }];
    readonly name: "withdrawRefund";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "safe";
        readonly type: "address";
    }];
    readonly name: "getTradeId";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "pure";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly name: "trades";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "safeAddress";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint64";
        readonly name: "deadline";
        readonly type: "uint64";
    }, {
        readonly internalType: "uint256";
        readonly name: "snapshotNonce";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint8";
        readonly name: "status";
        readonly type: "uint8";
    }, {
        readonly internalType: "bool";
        readonly name: "fundsHeld";
        readonly type: "bool";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly name: "activeTradeBySafe";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "tradeId";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "deadline";
        readonly type: "uint256";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "snapshotNonce";
        readonly type: "uint256";
    }];
    readonly name: "TradeArmed";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "tradeId";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "TradeFunded";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "tradeId";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "string";
        readonly name: "reason";
        readonly type: "string";
    }];
    readonly name: "TradeCancelled";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: true;
        readonly internalType: "bytes32";
        readonly name: "tradeId";
        readonly type: "bytes32";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "buyer";
        readonly type: "address";
    }, {
        readonly indexed: true;
        readonly internalType: "address";
        readonly name: "seller";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "TradeCompleted";
    readonly type: "event";
}, {
    readonly inputs: readonly [];
    readonly name: "Invalid";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NotSeller";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NotBuyer";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NotAuthorized";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "TransferFailed";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidState";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "DeadlinePassed";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "TradeAlreadyCompleted";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NoSuspiciousActivity";
    readonly type: "error";
}, {
    readonly stateMutability: "payable";
    readonly type: "receive";
}];
