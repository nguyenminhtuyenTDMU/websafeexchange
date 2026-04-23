import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import {
  insertTradeSchema,
  insertForumPostSchema,
  insertForumCommentSchema,
  type ForumPostType,
} from "@shared/schema";
import { z } from "zod";
import { eventBroadcaster } from "./websocket";
import { onTradeArmed, clearTradeNotifyCache } from "./safe-watcher";
import { requireSignature, validateEthAddress } from "./auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  eventBroadcaster.initialize(httpServer);

  // ─── Trades: read ───────────────────────────────────────────────────────────

  app.get("/api/trades", async (_req, res) => {
    try {
      const trades = await storage.getAllTrades();
      res.json(trades);
    } catch {
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
    } catch {
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
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy thông tin trade" });
    }
  });

  // ─── Trades: create ─────────────────────────────────────────────────────────

  /**
   * POST /api/trades
   * Body: { ...tradeFields, signature, signedMessage }
   * signedMessage phải là: "SafeExchange:create-trade:{safeAddress}:{isoTimestamp}"
   * Ký bởi sellerAddress
   */
  app.post("/api/trades", async (req, res) => {
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
  });

  // ─── Trades: join ───────────────────────────────────────────────────────────

  /**
   * POST /api/trades/:id/join
   * Body: { buyerAddress, signature, signedMessage }
   * signedMessage: "SafeExchange:join-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi buyerAddress
   */
  app.post("/api/trades/:id/join", async (req, res) => {
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
  });

  // ─── Trades: arm ────────────────────────────────────────────────────────────

  /**
   * POST /api/trades/:id/arm
   * Body: { onchainTradeId, snapshotNonce, signature, signedMessage }
   * signedMessage: "SafeExchange:arm-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi sellerAddress
   */
  app.post("/api/trades/:id/arm", async (req, res) => {
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
  });

  // ─── Trades: deposit ────────────────────────────────────────────────────────

  /**
   * POST /api/trades/:id/deposit
   * Body: { signature, signedMessage }
   * signedMessage: "SafeExchange:deposit:{tradeId}:{isoTimestamp}"
   * Ký bởi buyerAddress
   */
  app.post("/api/trades/:id/deposit", async (req, res) => {
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
  });

  // ─── Trades: complete ───────────────────────────────────────────────────────

  /**
   * POST /api/trades/:id/complete
   * Body: { signature, signedMessage }
   * signedMessage: "SafeExchange:complete-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi buyer hoặc seller
   */
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
  });

  // ─── Trades: cancel ─────────────────────────────────────────────────────────

  /**
   * POST /api/trades/:id/cancel
   * Body: { reason, signature, signedMessage }
   * signedMessage: "SafeExchange:cancel-trade:{tradeId}:{isoTimestamp}"
   * Ký bởi buyer hoặc seller
   */
  app.post("/api/trades/:id/cancel", async (req, res) => {
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
  });

  // ─── Safe info proxy ─────────────────────────────────────────────────────────

  app.get("/api/safe-info", async (req, res) => {
    try {
      const address = req.query.address as string;
      const chainId = parseInt((req.query.chainId as string) || process.env.CHAIN_ID || "11155111", 10);

      if (!validateEthAddress(address)) {
        return res.status(400).json({ error: "Địa chỉ Safe không hợp lệ" });
      }

      const SAFE_API_BASE: Record<number, string> = {
        1:        "https://safe-transaction-mainnet.safe.global",
        11155111: "https://safe-transaction-sepolia.safe.global",
      };

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
  });

  // ─── Logs ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/logs?tradeId=xxx
   * Logs chỉ được lấy theo tradeId cụ thể, không trả toàn bộ.
   * Để xem logs hệ thống cần filter SECURITY type về phía admin trong tương lai.
   */
  app.get("/api/logs", async (req, res) => {
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
  });

  // ─── Forum: posts ────────────────────────────────────────────────────────────

  app.get("/api/forum/posts", async (req, res) => {
    try {
      const type = req.query.type as ForumPostType | undefined;
      const validTypes: ForumPostType[] = ["SELL", "BUY_REQUEST", "DISCUSSION", "QA", "PINNED"];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({ error: "Loại bài đăng không hợp lệ" });
      }
      const posts = await storage.getForumPosts(type);
      res.json(posts);
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy bài đăng diễn đàn" });
    }
  });

  app.post("/api/forum/posts", async (req, res) => {
    try {
      const data = insertForumPostSchema.parse({
        ...req.body,
        isPinned: false,
      });
      if (data.type === "PINNED") {
        return res.status(403).json({ error: "Không thể tạo bài ghim" });
      }

      // Validate authorAddress nếu được cung cấp
      if (data.authorAddress && !validateEthAddress(data.authorAddress)) {
        return res.status(400).json({ error: "authorAddress không hợp lệ" });
      }

      // Giới hạn độ dài để chống spam
      if (data.content && data.content.length > 10000) {
        return res.status(400).json({ error: "Nội dung quá dài (tối đa 10000 ký tự)" });
      }
      if (data.title && data.title.length > 300) {
        return res.status(400).json({ error: "Tiêu đề quá dài (tối đa 300 ký tự)" });
      }

      const post = await storage.createForumPost(data);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: error.errors });
      }
      res.status(500).json({ error: "Lỗi khi đăng bài" });
    }
  });

  app.get("/api/forum/posts/:id", async (req, res) => {
    try {
      const post = await storage.getForumPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Không tìm thấy bài đăng" });
      const comments = await storage.getCommentsByPost(post.id);
      res.json({ ...post, comments });
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy bài đăng" });
    }
  });

  app.post("/api/forum/posts/:id/comments", async (req, res) => {
    try {
      const post = await storage.getForumPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Không tìm thấy bài đăng" });

      const data = insertForumCommentSchema.parse({
        ...req.body,
        postId: post.id,
      });

      // Validate authorAddress nếu có
      if (data.authorAddress && !validateEthAddress(data.authorAddress)) {
        return res.status(400).json({ error: "authorAddress không hợp lệ" });
      }

      // Giới hạn độ dài comment
      if (data.content.length > 5000) {
        return res.status(400).json({ error: "Bình luận quá dài (tối đa 5000 ký tự)" });
      }

      const comment = await storage.createComment(data);
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: error.errors });
      }
      res.status(500).json({ error: "Lỗi khi đăng bình luận" });
    }
  });

  // ─── User profile ────────────────────────────────────────────────────────────

  app.get("/api/users/profile", async (req, res) => {
    try {
      const address = req.query.address as string;
      if (!validateEthAddress(address)) {
        return res.status(400).json({ error: "Địa chỉ ví không hợp lệ" });
      }
      const user = await storage.getUserByWalletOrCreate(address);
      res.json(user);
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy profile" });
    }
  });

  /**
   * PATCH /api/users/profile
   * Body: { address, displayName, signature, signedMessage }
   * signedMessage: "SafeExchange:update-profile:{address}:{isoTimestamp}"
   * Ký bởi address — chứng minh quyền sở hữu ví
   */
  app.patch("/api/users/profile", async (req, res) => {
    try {
      const { address, displayName } = req.body;

      if (!validateEthAddress(address)) {
        return res.status(400).json({ error: "Địa chỉ ví không hợp lệ" });
      }
      if (!displayName?.trim()) {
        return res.status(400).json({ error: "Thiếu displayName" });
      }
      if (displayName.trim().length > 50) {
        return res.status(400).json({ error: "Tên hiển thị tối đa 50 ký tự" });
      }

      // Phải ký bằng chính ví đó mới được update
      const { error: authError } = await requireSignature(
        req,
        address,
        "update-profile",
        address.toLowerCase(),
      );
      if (authError) return res.status(401).json({ error: authError });

      const user = await storage.updateUserDisplayName(address, displayName);
      if (!user) return res.status(404).json({ error: "Không tìm thấy người dùng" });
      res.json(user);
    } catch {
      res.status(500).json({ error: "Lỗi khi cập nhật tên" });
    }
  });

  return httpServer;
}
