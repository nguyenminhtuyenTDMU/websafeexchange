/**
 * ABI cho SafeExchangeEscrow
 * Sync với contracts/SafeExchangeEscrowSoftGuard.sol
 */
export declare const escrowABI: ({
    inputs: never[];
    name: string;
    type: string;
    anonymous?: undefined;
    stateMutability?: undefined;
    outputs?: undefined;
} | {
    anonymous: boolean;
    inputs: {
        indexed: boolean;
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    type: string;
    stateMutability?: undefined;
    outputs?: undefined;
} | {
    stateMutability: string;
    type: string;
    inputs?: undefined;
    name?: undefined;
    anonymous?: undefined;
    outputs?: undefined;
} | {
    inputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    name: string;
    outputs: {
        internalType: string;
        name: string;
        type: string;
    }[];
    stateMutability: string;
    type: string;
    anonymous?: undefined;
})[];
