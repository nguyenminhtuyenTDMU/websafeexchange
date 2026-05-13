import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertTradeSchema } from "@shared/schema";
import { eventBroadcaster } from "../websocket";
import { onTradeArmed, clearTradeNotifyCache } from "../safe-watcher";
import { requireSignature, validateEthAddress } from "../auth";

export const tradeController = {
  getAll: async (_req: Request, res: Response) => {
    try {
      const trades = await storage.getAllTrades();
      res.json(trades);
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy danh sách giao dịch" });
    }
  },

  search: async (req: Request, res: Response) => {
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
    } catch {
      res.status(500).json({ error: "Lỗi khi tìm kiếm" });
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }
      res.json(trade);
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy thông tin trade" });
    }
  },

  /**
   * POST /api/trades
   * Body: { ...tradeFields, signature, signedMessage }
   * signedMessage phải là: "SafeExchange:create-trade:{safeAddress}:{isoTimestamp}"
   * Ký bởi sellerAddress
   */
  create: async (req: Request, res: Response) => {
    try {
      const deadlineInput = req.body?.deadline;
      const deadlineValue = deadlineInput ? new Date(deadlineInput) : undefined;

      if (deadlineValue && Number.isNaN(deadlineValue.getTime())) {
        return res.status(400).json({
          error: "Dữ liệu không hợp lệ",
          details: [{ path: ["deadline"], message: "Deadline không hợp lệ" }],
        });
      }

      const data = insertTradeSchema.parse({
        ...req.body,
        deadline: deadlineValue,
        // server-controlled fields — never accept from client
        status: "LISTED",
        onchainTradeId: null,
        snapshotNonce: null,
      });

      if (!validateEthAddress(data.sellerAddress)) {
        return res.status(400).json({ error: "sellerAddress không hợp lệ" });
      }
      if (!validateEthAddress(data.safeAddress)) {
        return res.status(400).json({ error: "safeAddress không hợp lệ" });
      }

      // Seller phải ký để chứng minh quyền tạo trade
      const { error: authError } = await requireSignature(
        req,
        data.sellerAddress,
        "create-trade",
        data.safeAddress.toLowerCase(),
      );
      if (authError) return res.status(401).json({ error: authError });

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

      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: error.errors });
      }
      res.status(500).json({ error: "Lỗi khi tạo trade" });
    }
  },

  /**
   * POST /api/trades/:id/join
   * Body: { buyerAddress, signature, signedMessage }
   * signedMessage: "SafeExchange:join-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi buyerAddress
   */
  join: async (req: Request, res: Response) => {
    try {
      const { buyerAddress } = req.body;
      if (!validateEthAddress(buyerAddress)) {
        return res.status(400).json({ error: "buyerAddress không hợp lệ" });
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

      // Buyer phải ký để xác nhận tham gia
      const { error: authError } = await requireSignature(
        req,
        buyerAddress,
        "join-trade",
        trade.id,
      );
      if (authError) return res.status(401).json({ error: authError });

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
      eventBroadcaster.sendToWallet(
        trade.sellerAddress!,
        "Người mua tham gia",
        "Có người mua đã tham gia giao dịch của bạn",
        "success"
      );

      res.json(updated);
    } catch {
      res.status(500).json({ error: "Lỗi khi tham gia trade" });
    }
  },

  /**
   * POST /api/trades/:id/arm
   * Body: { onchainTradeId, snapshotNonce, signature, signedMessage }
   * signedMessage: "SafeExchange:arm-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi sellerAddress
   */
  arm: async (req: Request, res: Response) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      if (trade.status !== "JOINED") {
        return res.status(400).json({ error: "Trade chưa có buyer tham gia" });
      }

      const { onchainTradeId, snapshotNonce } = req.body;

      const updated = await storage.updateTrade(req.params.id, {
        status: "ARMED",
        ...(onchainTradeId && { onchainTradeId }),
        ...(snapshotNonce != null && { snapshotNonce: String(snapshotNonce) }),
      });

      await storage.createLog({
        type: "TRADE_EVENT",
        message: `Trade đã được arm - Safe ${trade.safeAddress.slice(0, 10)}... bị khóa (snapshotNonce: ${snapshotNonce ?? "chưa có"})`,
        relatedTradeId: trade.id,
      });

      eventBroadcaster.broadcastTradeUpdate(trade.id, "ARMED", { safeAddress: trade.safeAddress });
      eventBroadcaster.sendToWallet(
        trade.buyerAddress!,
        "Giao dịch được kích hoạt",
        "Người bán đã kích hoạt. Bạn có thể gửi ký quỹ ETH ngay bây giờ.",
        "success"
      );

      onTradeArmed(trade.safeAddress);

      res.json(updated);
    } catch {
      res.status(500).json({ error: "Lỗi khi arm trade" });
    }
  },

  /**
   * POST /api/trades/:id/deposit
   * Body: { signature, signedMessage }
   * signedMessage: "SafeExchange:deposit:{tradeId}:{isoTimestamp}"
   * Ký bởi buyerAddress
   */
  deposit: async (req: Request, res: Response) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      if (trade.status !== "ARMED") {
        return res.status(400).json({ error: "Trade chưa được arm" });
      }

      if (!trade.buyerAddress) {
        return res.status(400).json({ error: "Trade chưa có buyer" });
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
      eventBroadcaster.sendToWallet(
        trade.sellerAddress!,
        "Đã nhận ký quỹ",
        `Người mua đã gửi ${trade.priceEth} ETH vào ký quỹ. Chuyển quyền sở hữu Safe ngay.`,
        "success"
      );

      res.json(updated);
    } catch {
      res.status(500).json({ error: "Lỗi khi deposit" });
    }
  },

  /**
   * POST /api/trades/:id/complete
   * Body: { signature, signedMessage }
   * signedMessage: "SafeExchange:complete-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi buyer hoặc seller
   */
  complete: async (req: Request, res: Response) => {
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
      eventBroadcaster.sendToParticipants(
        "Giao dịch hoàn tất",
        "Quyền sở hữu Safe đã được chuyển thành công. Thanh toán đã được thực hiện.",
        "success",
        trade.sellerAddress, trade.buyerAddress
      );

      clearTradeNotifyCache(trade.id);

      res.json(updated);
    } catch {
      res.status(500).json({ error: "Lỗi khi hoàn tất trade" });
    }
  },

  /**
   * POST /api/trades/:id/cancel
   * Body: { reason, signature, signedMessage }
   * signedMessage: "SafeExchange:cancel-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi buyer hoặc seller
   */
  cancel: async (req: Request, res: Response) => {
    try {
      const { reason, walletAddress } = req.body;
      const trade = await storage.getTrade(req.params.id);
      if (!trade) {
        return res.status(404).json({ error: "Không tìm thấy trade" });
      }

      // Chỉ cho phép cancel khi chưa complete
      if (trade.status === "COMPLETED") {
        return res.status(400).json({ error: "Không thể hủy trade đã hoàn tất" });
      }

      // Chỉ buyer hoặc seller của trade này được phép hủy
      const caller = walletAddress?.toLowerCase();
      const isSeller = caller && caller === trade.sellerAddress?.toLowerCase();
      const isBuyer  = caller && caller === trade.buyerAddress?.toLowerCase();
      if (!isSeller && !isBuyer) {
        return res.status(403).json({ error: "Không có quyền hủy giao dịch này" });
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
      eventBroadcaster.sendToParticipants(
        "Giao dịch đã hủy",
        `Giao dịch đã bị hủy: ${reason || "Không rõ lý do"}`,
        "warning",
        trade.sellerAddress, trade.buyerAddress
      );

      clearTradeNotifyCache(trade.id);

      res.json(updated);
    } catch {
      res.status(500).json({ error: "Lỗi khi hủy trade" });
    }
  },
};
