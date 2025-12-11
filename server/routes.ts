import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema, insertEvidenceSchema, insertSystemLogSchema } from "@shared/schema";
import { z } from "zod";
import { recoverMessageAddress } from "viem";
import { eventBroadcaster } from "./websocket";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  eventBroadcaster.initialize(httpServer);
  
  app.get("/api/trades", async (req, res) => {
    try {
      const trades = await storage.getAllTrades();
      res.json(trades);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi lấy danh sách giao dịch" });
    }
  });

  app.get("/api/trades/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Vui lòng cung cấp từ khóa tìm kiếm" });
      }

      let trade = await storage.getTrade(query);
      
      if (!trade && query.startsWith("0x")) {
        trade = await storage.getTradeBySafeAddress(query);
      }

      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi tìm kiếm" });
    }
  });

  app.get("/api/trades/:id", async (req, res) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }
      res.json(trade);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi lấy thông tin trade" });
    }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const data = insertTradeSchema.parse(req.body);
      
      const existingTrade = await storage.getTradeBySafeAddress(data.safeAddress);
      if (existingTrade) {
        return res.status(400).json({ error: "Safe này đang có trade đang hoạt động" });
      }

      const trade = await storage.createTrade(data);
      
      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Đã tạo trade mới cho Safe ${data.safeAddress.slice(0, 10)}...`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastNewTrade(trade);
      eventBroadcaster.broadcastNotification(
        "Giao dịch mới",
        `Đơn bán Safe ${data.safeAddress.slice(0, 8)}... đã được tạo`,
        "info"
      );

      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: error.errors });
      }
      res.status(500).json({ error: "Lỗi khi tạo trade" });
    }
  });

  app.post("/api/trades/:id/join", async (req, res) => {
    try {
      const { buyerAddress } = req.body;
      if (!buyerAddress) {
        return res.status(400).json({ error: "Vui lòng cung cấp địa chỉ buyer" });
      }

      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      if (trade.status !== "LISTED") {
        return res.status(400).json({ error: "Trade không ở trạng thái có thể tham gia" });
      }

      if (trade.sellerAddress.toLowerCase() === buyerAddress.toLowerCase()) {
        return res.status(400).json({ error: "Seller không thể tự mua Safe của mình" });
      }

      const updated = await storage.updateTrade(req.params.id, {
        buyerAddress,
        status: "JOINED",
      });

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Buyer ${buyerAddress.slice(0, 10)}... đã tham gia trade`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastTradeUpdate(trade.id, "JOINED", { buyerAddress });
      eventBroadcaster.broadcastNotification(
        "Người mua tham gia",
        `Có người mua đã tham gia giao dịch của bạn`,
        "success"
      );

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi tham gia trade" });
    }
  });

  app.post("/api/trades/:id/arm", async (req, res) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      if (trade.status !== "JOINED") {
        return res.status(400).json({ error: "Trade chưa có buyer tham gia" });
      }

      const updated = await storage.updateTrade(req.params.id, {
        status: "ARMED",
      });

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Trade đã được arm - Safe ${trade.safeAddress.slice(0, 10)}... bị khóa`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastTradeUpdate(trade.id, "ARMED", { safeAddress: trade.safeAddress });
      eventBroadcaster.broadcastNotification(
        "Giao dịch được kích hoạt",
        `Safe ${trade.safeAddress.slice(0, 8)}... đã bị khóa. Chờ người mua gửi ký quỹ.`,
        "success"
      );

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi arm trade" });
    }
  });

  app.post("/api/trades/:id/deposit", async (req, res) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      if (trade.status !== "ARMED") {
        return res.status(400).json({ error: "Trade chưa được arm" });
      }

      const updated = await storage.updateTrade(req.params.id, {
        status: "FUNDED",
      });

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Buyer đã deposit ${trade.priceEth} ETH vào escrow`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastTradeUpdate(trade.id, "FUNDED", { priceEth: trade.priceEth });
      eventBroadcaster.broadcastNotification(
        "Đã nhận ký quỹ",
        `Người mua đã gửi ${trade.priceEth} ETH vào ký quỹ. Chuyển quyền sở hữu Safe ngay.`,
        "success"
      );

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi deposit" });
    }
  });

  app.post("/api/trades/:id/complete", async (req, res) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      if (trade.status !== "FUNDED") {
        return res.status(400).json({ error: "Trade chưa được funded" });
      }

      const updated = await storage.updateTrade(req.params.id, {
        status: "COMPLETED",
      });

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Trade hoàn tất - Quyền sở hữu đã chuyển cho buyer`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastTradeUpdate(trade.id, "COMPLETED", {});
      eventBroadcaster.broadcastNotification(
        "Giao dịch hoàn tất",
        `Quyền sở hữu Safe đã được chuyển thành công. Thanh toán đã được thực hiện.`,
        "success"
      );

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi hoàn tất trade" });
    }
  });

  app.post("/api/trades/:id/cancel", async (req, res) => {
    try {
      const { reason } = req.body;
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      const updated = await storage.updateTrade(req.params.id, {
        status: "CANCELLED",
      });

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Trade đã bị hủy: ${reason || "Không rõ lý do"}`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastTradeUpdate(trade.id, "CANCELLED", { reason });
      eventBroadcaster.broadcastNotification(
        "Giao dịch đã hủy",
        `Giao dịch đã bị hủy: ${reason || "Không rõ lý do"}`,
        "warning"
      );

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi hủy trade" });
    }
  });

  app.get("/api/safe-info", async (req, res) => {
    try {
      const address = req.query.address as string;
      if (!address || !address.startsWith("0x")) {
        return res.status(400).json({ error: "Địa chỉ Safe không hợp lệ" });
      }

      const mockSafeInfo = {
        address: address,
        owners: [
          "0x1234567890abcdef1234567890abcdef12345678",
          "0xabcdef1234567890abcdef1234567890abcdef12",
        ],
        threshold: 1,
        nonce: 5,
        modules: [],
        guard: null,
        version: "1.3.0",
        chainId: 1,
      };

      res.json(mockSafeInfo);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi lấy thông tin Safe" });
    }
  });

  app.get("/api/evidence", async (req, res) => {
    try {
      const evidence = await storage.getAllEvidence();
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi lấy danh sách bằng chứng" });
    }
  });

  app.post("/api/evidence", async (req, res) => {
    try {
      const data = insertEvidenceSchema.parse(req.body);
      const evidence = await storage.createEvidence(data);

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Đã tạo bằng chứng mới từ ${data.signerAddress.slice(0, 10)}...`,
        relatedTradeId: data.tradeId || null,
      });

      res.status(201).json(evidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: error.errors });
      }
      res.status(500).json({ error: "Lỗi khi tạo bằng chứng" });
    }
  });

  app.post("/api/evidence/verify", async (req, res) => {
    try {
      const { hash, signature, signerAddress } = req.body;
      
      if (!hash || !signature || !signerAddress) {
        return res.status(400).json({ error: "Thiếu thông tin xác minh" });
      }

      try {
        const recoveredAddress = await recoverMessageAddress({
          message: hash,
          signature: signature as `0x${string}`,
        });

        const isValid = recoveredAddress.toLowerCase() === signerAddress.toLowerCase();
        res.json({ valid: isValid, recoveredAddress });
      } catch {
        res.json({ valid: false, error: "Chữ ký không hợp lệ" });
      }
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi xác minh" });
    }
  });

  app.get("/api/logs", async (req, res) => {
    try {
      const logs = await storage.getSystemLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi lấy logs" });
    }
  });

  return httpServer;
}
