import type { Request, Response } from "express";
import { storage } from "../storage";

export const logController = {
  /**
   * GET /api/logs?tradeId=xxx
   * Logs chỉ được lấy theo tradeId cụ thể, không trả toàn bộ.
   * Để xem logs hệ thống cần filter SECURITY type về phía admin trong tương lai.
   */
  getLogs: async (req: Request, res: Response) => {
    try {
      const tradeId = req.query.tradeId as string | undefined;

      if (!tradeId) {
        return res.status(400).json({ error: "Vui lòng cung cấp tradeId để lọc logs" });
      }

      const trade = await storage.getTrade(tradeId);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      // Chỉ trả logs loại TRADE_EVENT — không lộ SECURITY logs ra ngoài
      const allLogs = await storage.getLogsByTrade(tradeId);
      const publicLogs = allLogs.filter(l => l.type === "TRADE_EVENT");
      res.json(publicLogs);
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy logs" });
    }
  },
};
