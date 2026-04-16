export declare const SAFE_EXCHANGE_ABI: readonly [{
    readonly inputs: readonly [];
    readonly name: "DeadlinePassed";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "GuardNotAttached";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "Invalid";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "InvalidState";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NotBuyer";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NotFound";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "NotSeller";
    readonly type: "error";
}, {
    readonly inputs: readonly [];
    readonly name: "TransferFailed";
    readonly type: "error";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "tradeId";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "sender";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes4";
        readonly name: "selector";
        readonly type: "bytes4";
    }, {
        readonly indexed: false;
        readonly internalType: "string";
        readonly name: "reason";
        readonly type: "string";
    }];
    readonly name: "GuardObservedCheat";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "safe";
        readonly type: "address";
    }, {
        readonly indexed: false;
        readonly internalType: "bytes32";
        readonly name: "tradeId";
        readonly type: "bytes32";
    }, {
        readonly indexed: false;
        readonly internalType: "address";
        readonly name: "newOwner";
        readonly type: "address";
    }];
    readonly name: "GuardObservedSwap";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
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
    }];
    readonly name: "TradeArmed";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
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
        readonly indexed: false;
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
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "TradeCompleted";
    readonly type: "event";
}, {
    readonly anonymous: false;
    readonly inputs: readonly [{
        readonly indexed: false;
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
        readonly internalType: "uint256";
        readonly name: "amount";
        readonly type: "uint256";
    }];
    readonly name: "TradeFunded";
    readonly type: "event";
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
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly name: "buyerTrades";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
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
        readonly name: "";
        readonly type: "bytes32";
    }, {
        readonly internalType: "bool";
        readonly name: "success";
        readonly type: "bool";
    }];
    readonly name: "checkAfterExecution";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "bytes";
        readonly name: "data";
        readonly type: "bytes";
    }, {
        readonly internalType: "enum ISafe.Operation";
        readonly name: "op";
        readonly type: "uint8";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "address payable";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "bytes";
        readonly name: "";
        readonly type: "bytes";
    }, {
        readonly internalType: "address";
        readonly name: "msgSender";
        readonly type: "address";
    }];
    readonly name: "checkTransaction";
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
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly name: "sellerTrades";
    readonly outputs: readonly [{
        readonly internalType: "bytes32";
        readonly name: "";
        readonly type: "bytes32";
    }];
    readonly stateMutability: "view";
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
        readonly internalType: "enum SafeExchangeEscrowSoftGuard.TradeStatus";
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
        readonly internalType: "bytes32";
        readonly name: "id";
        readonly type: "bytes32";
    }];
    readonly name: "withdrawRefund";
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly stateMutability: "payable";
    readonly type: "receive";
}];
export declare const GUARD_CONTRACT_ADDRESS = "0x82d13B105491611DD2b024aF43b3a8fC513ad8F3";
