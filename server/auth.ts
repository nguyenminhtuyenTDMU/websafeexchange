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

import { recoverMessageAddress, isAddress } from 'viem';
import type { Request, Response } from 'express';

const SIGNATURE_WINDOW_MS = 5 * 60 * 1000; // 5 phút

export function buildSignMessage(action: string, scope: string, timestamp: string): string {
  return `SafeExchange:${action}:${scope}:${timestamp}`;
}

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
export async function verifySignature(
  signature: string,
  message: string,
  expectedAddress: string,
): Promise<VerifyResult> {
  try {
    // Parse timestamp từ message format "SafeExchange:{action}:{scope}:{timestamp}"
    const parts = message.split(':');
    if (parts.length < 4 || parts[0] !== 'SafeExchange') {
      return { error: 'Message format không hợp lệ', recoveredAddress: null };
    }

    // Timestamp là phần cuối (có thể chứa ':' nếu ISO string — nối lại)
    const timestampStr = parts.slice(3).join(':');
    const msgTime = new Date(timestampStr).getTime();
    if (isNaN(msgTime)) {
      return { error: 'Timestamp trong message không hợp lệ', recoveredAddress: null };
    }

    const now = Date.now();
    if (Math.abs(now - msgTime) > SIGNATURE_WINDOW_MS) {
      return { error: 'Chữ ký đã hết hạn (quá 5 phút)', recoveredAddress: null };
    }

    const recovered = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    if (recovered.toLowerCase() !== expectedAddress.toLowerCase()) {
      return {
        error: `Chữ ký không khớp với địa chỉ ${expectedAddress.slice(0, 10)}...`,
        recoveredAddress: recovered,
      };
    }

    return { error: null, recoveredAddress: recovered };
  } catch {
    return { error: 'Chữ ký không hợp lệ hoặc không thể giải mã', recoveredAddress: null };
  }
}

/**
 * Validate địa chỉ Ethereum đầy đủ (42 ký tự, checksum-compatible).
 */
export function validateEthAddress(address: unknown): address is string {
  return typeof address === 'string' && isAddress(address);
}

/**
 * Middleware helper: đọc { signature, signedMessage } từ req.body,
 * verify so với expectedAddress. Trả về { error } nếu thất bại.
 */
export async function requireSignature(
  req: Request,
  expectedAddress: string,
  action: string,
  scope: string,
): Promise<{ error: string | null }> {
  const { signature, signedMessage } = req.body ?? {};

  if (!signature || !signedMessage) {
    return { error: 'Thiếu signature hoặc signedMessage trong request' };
  }

  // Kiểm tra message có đúng action và scope không (chống reuse chữ ký sang endpoint khác)
  if (!signedMessage.includes(`SafeExchange:${action}:${scope}:`)) {
    return { error: `Message không khớp với action "${action}" và scope "${scope}"` };
  }

  const result = await verifySignature(signature, signedMessage, expectedAddress);
  return { error: result.error };
}
