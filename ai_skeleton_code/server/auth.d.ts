/**
 * auth.ts — EIP-191 signature verification cho Web3 authentication.
 *
 * Pattern:
 *  1. Client tạo message: "SafeExchange:{action}:{scope}:{isoTimestamp}"
 *  2. Client ký bằng eth_sign / personal_sign (MetaMask, wagmi signMessage)
 *  3. Server gọi verifySignature() → recover address → compare với expectedAddress
 *  4. Server kiểm tra timestamp trong window 5 phút để chống replay attack
 *
 * Sử dụng:
 *   const { error } = await requireSignature(req, expectedAddress, action, scope);
 *   if (error) return res.status(401).json({ error });
 */
import type { Request } from 'express';
export declare function buildSignMessage(action: string, scope: string, timestamp: string): string;
interface VerifyResult {
    error: string | null;
    recoveredAddress: string | null;
}
/**
 * Verify EIP-191 signature và kiểm tra timestamp freshness.
 * @param signature  Hex signature từ client (0x...)
 * @param message    Message gốc đã ký (chưa hash thêm — viem tự thêm prefix)
 * @param expectedAddress  Địa chỉ ví kỳ vọng (sẽ so sánh case-insensitive)
 */
export declare function verifySignature(signature: string, message: string, expectedAddress: string): Promise<VerifyResult>;
/**
 * Validate địa chỉ Ethereum đầy đủ (42 ký tự, checksum-compatible).
 */
export declare function validateEthAddress(address: unknown): address is string;
/**
 * Middleware helper: đọc { signature, signedMessage } từ req.body,
 * verify so với expectedAddress. Trả về { error } nếu thất bại.
 */
export declare function requireSignature(req: Request, expectedAddress: string, action: string, scope: string): Promise<{
    error: string | null;
}>;
export {};
