import type { Request, Response } from "express";
import { validateEthAddress } from "../auth";

const SAFE_API_BASE: Record<number, string> = {
  1:        "https://safe-transaction-mainnet.safe.global",
  11155111: "https://safe-transaction-sepolia.safe.global",
};

export const safeController = {
  getInfo: async (req: Request, res: Response) => {
    try {
      const address = req.query.address as string;
      const chainId = parseInt((req.query.chainId as string) || process.env.CHAIN_ID || "11155111", 10);

      if (!validateEthAddress(address)) {
        return res.status(400).json({ error: "Địa chỉ Safe không hợp lệ" });
      }

      const baseUrl = SAFE_API_BASE[chainId];
      if (!baseUrl) {
        return res.status(400).json({ error: `Chain ${chainId} không được hỗ trợ` });
      }

      // Encode address để tránh path traversal
      const encodedAddress = encodeURIComponent(address);
      const safeRes = await fetch(`${baseUrl}/api/v1/safes/${encodedAddress}/`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (!safeRes.ok) {
        const text = await safeRes.text().catch(() => "");
        return res.status(safeRes.status).json({ error: "Không lấy được thông tin Safe", detail: text });
      }

      const data = await safeRes.json();
      res.json(data);
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy thông tin Safe" });
    }
  },
};
