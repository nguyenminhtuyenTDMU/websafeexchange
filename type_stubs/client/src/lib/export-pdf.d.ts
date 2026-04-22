interface EvidenceData {
    hash: string;
    signature: string;
    signerAddress: string;
    timestamp: string;
    tradeId?: string;
    payload?: string;
}
export declare function exportEvidencePDF(evidence: EvidenceData): void;
export declare function exportTradeEvidencePDF(trade: {
    id: string;
    safeAddress: string;
    sellerAddress: string;
    buyerAddress?: string | null;
    priceEth: string;
    status: string;
    createdAt: string;
    deadline: string;
}): void;
export {};
