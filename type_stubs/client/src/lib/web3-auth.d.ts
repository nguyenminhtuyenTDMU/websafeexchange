/**
 * web3-auth.ts — Client-side helper để ký EIP-191 message trước khi gọi API.
 *
 * Pattern:
 *   1. Gọi buildAuthPayload(signMessageAsync, action, scope)
 *   2. Kết quả { signature, signedMessage } đưa vào body của API request
 *   3. Server dùng recoverMessageAddress() để xác minh
 *
 * Message format: "SafeExchange:{action}:{scope}:{isoTimestamp}"
 * - action:    tên operation, ví dụ "create-trade", "join-trade"
 * - scope:     tradeId hoặc safeAddress / walletAddress, để chống reuse chữ ký sang endpoint khác
 * - timestamp: ISO 8601, server reject nếu cách thời điểm verify > 5 phút
 */
type SignMessageFn = (args: {
    message: string;
}) => Promise<`0x${string}`>;
export interface AuthPayload {
    signature: `0x${string}`;
    signedMessage: string;
}
/**
 * Xây dựng và ký message xác thực.
 * @param signMessageAsync  Hàm signMessageAsync từ wagmi useSignMessage()
 * @param action            Tên action, phải khớp với route server
 * @param scope             tradeId hoặc địa chỉ ví (lowercase)
 */
export declare function buildAuthPayload(signMessageAsync: SignMessageFn, action: string, scope: string): Promise<AuthPayload>;
export {};
