import { db } from "./db";
import { eq, desc, and, not, inArray } from "drizzle-orm";
import {
  users, trades, systemLogs, forumPosts, forumComments,
  type User, type InsertUser,
  type Trade, type InsertTrade,
  type SystemLog, type InsertSystemLog,
  type ForumPost, type InsertForumPost,
  type ForumComment, type InsertForumComment,
  type ForumPostType,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTrade(id: string): Promise<Trade | undefined>;
  getTradesBySeller(sellerAddress: string): Promise<Trade[]>;
  getTradesByBuyer(buyerAddress: string): Promise<Trade[]>;
  getTradeBySafeAddress(safeAddress: string): Promise<Trade | undefined>;
  getAllTrades(): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, data: Partial<Trade>): Promise<Trade | undefined>;
  
  getSystemLogs(): Promise<SystemLog[]>;
  getLogsByTrade(tradeId: string): Promise<SystemLog[]>;
  createLog(log: InsertSystemLog): Promise<SystemLog>;

  getForumPosts(type?: ForumPostType): Promise<ForumPost[]>;
  getForumPost(id: string): Promise<ForumPost | undefined>;
  createForumPost(post: InsertForumPost): Promise<ForumPost>;
  deleteForumPost(id: string): Promise<boolean>;
  seedForumPosts(): Promise<void>;

  getCommentsByPost(postId: string): Promise<ForumComment[]>;
  createComment(comment: InsertForumComment): Promise<ForumComment>;

  getUserByWalletOrCreate(walletAddress: string): Promise<User>;
  updateUserDisplayName(walletAddress: string, displayName: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users)
      .values({ ...insertUser, walletAddress: insertUser.walletAddress.toLowerCase() })
      .returning();
    return user;
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades).where(eq(trades.id, id)).limit(1);
    return trade;
  }

  async getTradesBySeller(sellerAddress: string): Promise<Trade[]> {
    return db.select().from(trades)
      .where(eq(trades.sellerAddress, sellerAddress.toLowerCase()))
      .orderBy(desc(trades.createdAt));
  }

  async getTradesByBuyer(buyerAddress: string): Promise<Trade[]> {
    return db.select().from(trades)
      .where(eq(trades.buyerAddress, buyerAddress.toLowerCase()))
      .orderBy(desc(trades.createdAt));
  }

  async getTradeBySafeAddress(safeAddress: string): Promise<Trade | undefined> {
    const [trade] = await db.select().from(trades)
      .where(
        and(
          eq(trades.safeAddress, safeAddress.toLowerCase()),
          not(inArray(trades.status, ["COMPLETED", "CANCELLED"]))
        )
      )
      .limit(1);
    return trade;
  }

  async getAllTrades(): Promise<Trade[]> {
    return db.select().from(trades).orderBy(desc(trades.createdAt));
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    const [trade] = await db.insert(trades)
      .values({
        ...insertTrade,
        safeAddress: insertTrade.safeAddress.toLowerCase(),
        sellerAddress: insertTrade.sellerAddress.toLowerCase(),
        buyerAddress: insertTrade.buyerAddress?.toLowerCase(),
      })
      .returning();
    return trade;
  }

  async updateTrade(id: string, data: Partial<Trade>): Promise<Trade | undefined> {
    const updateData = { ...data, updatedAt: new Date() };
    if (updateData.buyerAddress) {
      updateData.buyerAddress = updateData.buyerAddress.toLowerCase();
    }
    const [trade] = await db.update(trades)
      .set(updateData)
      .where(eq(trades.id, id))
      .returning();
    return trade;
  }

  async getSystemLogs(): Promise<SystemLog[]> {
    return db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt));
  }

  async getLogsByTrade(tradeId: string): Promise<SystemLog[]> {
    return db.select().from(systemLogs)
      .where(eq(systemLogs.relatedTradeId, tradeId))
      .orderBy(desc(systemLogs.createdAt));
  }

  async createLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const [log] = await db.insert(systemLogs).values(insertLog).returning();
    return log;
  }

  async getUserByWalletOrCreate(walletAddress: string): Promise<User> {
    const addr = walletAddress.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.walletAddress, addr)).limit(1);
    if (existing) return existing;
    const [created] = await db.insert(users).values({ walletAddress: addr }).returning();
    return created;
  }

  async updateUserDisplayName(walletAddress: string, displayName: string): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ displayName: displayName.trim() })
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .returning();
    return updated;
  }

  async getForumPosts(type?: ForumPostType): Promise<ForumPost[]> {
    if (type) {
      return db.select().from(forumPosts)
        .where(eq(forumPosts.type, type))
        .orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt));
    }
    return db.select().from(forumPosts)
      .orderBy(desc(forumPosts.isPinned), desc(forumPosts.createdAt));
  }

  async getForumPost(id: string): Promise<ForumPost | undefined> {
    const [post] = await db.select().from(forumPosts).where(eq(forumPosts.id, id)).limit(1);
    return post;
  }

  async createForumPost(post: InsertForumPost): Promise<ForumPost> {
    const [created] = await db.insert(forumPosts).values(post).returning();
    return created;
  }

  async deleteForumPost(id: string): Promise<boolean> {
    const result = await db.delete(forumPosts).where(eq(forumPosts.id, id)).returning();
    return result.length > 0;
  }

  async getCommentsByPost(postId: string): Promise<ForumComment[]> {
    return db.select().from(forumComments)
      .where(eq(forumComments.postId, postId))
      .orderBy(forumComments.createdAt);
  }

  async createComment(comment: InsertForumComment): Promise<ForumComment> {
    const [created] = await db.insert(forumComments).values(comment).returning();
    return created;
  }

  async seedForumPosts(): Promise<void> {
    const existing = await db.select().from(forumPosts)
      .where(eq(forumPosts.isPinned, true))
      .limit(1);
    if (existing.length > 0) return;

    const seeds: InsertForumPost[] = [
      // ── PINNED: hướng dẫn quy trình ──────────────────────────────────
      {
        type: "PINNED",
        isPinned: true,
        title: "Quy trình giao dịch 5 bước",
        authorAlias: "SafeExchange",
        content:
          "1. Người bán tạo đơn bán (Safe address, giá ETH, deadline).\n" +
          "2. Người mua tìm đơn và xác nhận tham gia — nên kiểm tra ví qua trang Minh bạch ví.\n" +
          "3. Người bán cài Guard contract và kích hoạt (armTrade) trên blockchain. Safe bị khoá, chỉ cho phép chuyển quyền đến buyer.\n" +
          "4. Người mua gửi ETH vào hợp đồng ký quỹ. Tiền giữ an toàn trong smart contract.\n" +
          "5. Người bán chuyển ownership trong Safe App → Guard xác minh → ETH tự động giải phóng cho seller.",
      },
      {
        type: "PINNED",
        isPinned: true,
        title: "Cảnh báo lừa đảo phổ biến",
        authorAlias: "SafeExchange",
        content:
          "• Giả mạo website: luôn kiểm tra URL chính xác, không truy cập link không rõ nguồn.\n" +
          "• Giao dịch ngoài hệ thống: không bao giờ chuyển ETH trực tiếp cho seller ngoài escrow contract.\n" +
          "• Yêu cầu private key/seed phrase: SafeExchange KHÔNG BAO GIỜ yêu cầu điều này.\n" +
          "• Giả mạo giao dịch: luôn đọc kỹ nội dung TX trong ví trước khi ký.",
      },
      // ── PINNED: pháp lý ───────────────────────────────────────────────
      {
        type: "PINNED",
        isPinned: true,
        title: "Điều khoản sử dụng",
        authorAlias: "SafeExchange",
        content:
          "SafeExchange cung cấp giao diện tương tác với smart contract — không lưu trữ, không kiểm soát tài sản của bạn.\n\n" +
          "Trách nhiệm của người dùng:\n" +
          "• Bảo mật private key và seed phrase.\n" +
          "• Xác minh thông tin giao dịch trước khi ký.\n" +
          "• Hiểu rõ rủi ro khi tương tác với smart contract.\n" +
          "• Tuân thủ pháp luật địa phương.\n\n" +
          "Không sử dụng nền tảng để thực hiện hoạt động bất hợp pháp, rửa tiền, lừa đảo.",
      },
      {
        type: "PINNED",
        isPinned: true,
        title: "Miễn trừ trách nhiệm",
        authorAlias: "SafeExchange",
        content:
          "Smart contract và blockchain là công nghệ mới, có thể chứa lỗi chưa được phát hiện.\n\n" +
          "SafeExchange được cung cấp 'as-is' — chúng tôi không chịu trách nhiệm về:\n" +
          "• Mất mát tài sản do lỗi phần mềm hoặc smart contract.\n" +
          "• Giao dịch thất bại hoặc bị hoàn tác.\n" +
          "• Hành vi của bên thứ ba.\n\n" +
          "Chỉ giao dịch với số tiền bạn có thể chấp nhận mất.",
      },
      // ── QA ghim: câu hỏi thường gặp từ trang Learn ────────────────────
      {
        type: "QA",
        isPinned: true,
        question: "Guard contract là gì?",
        authorAlias: "SafeExchange",
        content:
          "Guard là hợp đồng thông minh cài vào Safe để kiểm soát giao dịch. Trong SafeExchange, Guard đảm bảo seller chỉ có thể chuyển quyền đến đúng buyer, không thể thực hiện giao dịch khác khi trade đang hoạt động.",
      },
      {
        type: "QA",
        isPinned: true,
        question: "Điều gì xảy ra nếu người bán không hoàn tất đúng hạn?",
        authorAlias: "SafeExchange",
        content:
          "Khi hết deadline, bất kỳ ai cũng có thể gọi cancelTimeout. Giao dịch bị huỷ và buyer được hoàn lại 100% ETH đã gửi ký quỹ.",
      },
      {
        type: "QA",
        isPinned: true,
        question: "Làm sao kiểm tra Safe an toàn trước khi mua?",
        authorAlias: "SafeExchange",
        content:
          "Dùng trang Thông tin ví để kiểm tra: danh sách owners hiện tại, modules đã cài, guard đang hoạt động và lịch sử giao dịch của Safe.",
      },
      {
        type: "QA",
        isPinned: true,
        question: "Tiền ký quỹ của tôi được bảo vệ như thế nào?",
        authorAlias: "SafeExchange",
        content:
          "ETH được giữ trong escrow smart contract — không ai có thể rút ngoài điều kiện quy định. Seller chỉ nhận tiền khi buyer trở thành owner. Buyer được hoàn tiền nếu giao dịch bị huỷ.",
      },
      {
        type: "QA",
        isPinned: true,
        question: "SafeExchange có lưu trữ tài sản của tôi không?",
        authorAlias: "SafeExchange",
        content:
          "Không. SafeExchange là nền tảng phi tập trung. Chúng tôi không lưu ETH và không có quyền kiểm soát Safe của bạn. Tất cả xử lý bởi smart contract trên blockchain.",
      },
      {
        type: "QA",
        isPinned: true,
        question: "Có phí dịch vụ không?",
        authorAlias: "SafeExchange",
        content:
          "Hiện tại SafeExchange không thu phí dịch vụ. Bạn chỉ trả gas fee cho các giao dịch trên Ethereum (armTrade, deposit, releaseFunds).",
      },
    ];

    await db.insert(forumPosts).values(seeds);
  }
}

export const storage = new DatabaseStorage();
