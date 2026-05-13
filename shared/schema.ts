import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const tradeStatusEnum = pgEnum("trade_status", [
  "DRAFT",
  "LISTED",
  "JOINED",
  "ARMED",
  "FUNDED",
  "COMPLETED",
  "CANCELLED"
]);

export const logTypeEnum = pgEnum("log_type", [
  "TRADE_EVENT",
  "SECURITY",
  "SYSTEM"
]);

export const forumPostTypeEnum = pgEnum("forum_post_type", [
  "SELL",
  "BUY_REQUEST",
  "DISCUSSION",
  "QA",
  "PINNED",
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  safeAddress: text("safe_address").notNull(),
  sellerAddress: text("seller_address").notNull(),
  buyerAddress: text("buyer_address"),
  priceEth: decimal("price_eth", { precision: 18, scale: 8 }).notNull(),
  deadline: timestamp("deadline").notNull(),
  onchainTradeId: text("onchain_trade_id"),
  snapshotNonce: text("snapshot_nonce"),
  status: tradeStatusEnum("status").default("DRAFT").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: logTypeEnum("type").notNull(),
  message: text("message").notNull(),
  relatedTradeId: varchar("related_trade_id").references(() => trades.id),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const forumPosts = pgTable("forum_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: forumPostTypeEnum("type").notNull(),
  title: text("title"),
  question: text("question"),
  content: text("content").notNull().default(""),
  tags: text("tags"),                          // JSON array string, e.g. '["sepolia","2-of-3"]'
  authorAlias: text("author_alias").notNull().default("Ẩn danh"),
  authorAddress: text("author_address"),
  contact: text("contact"),
  budgetEth: decimal("budget_eth", { precision: 18, scale: 8 }),
  isPinned: boolean("is_pinned").default(false).notNull(),
  safeAddress: text("safe_address"),           // for SELL posts: the Safe being listed
  safeSnapshot: text("safe_snapshot"),         // JSON snapshot of on-chain Safe state at post time
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const forumComments = pgTable("forum_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => forumPosts.id, { onDelete: "cascade" }),
  parentId: varchar("parent_id"),               // reply to another comment (no FK to allow self-ref)
  content: text("content").notNull(),
  authorAlias: text("author_alias").notNull().default("Ẩn danh"),
  authorAddress: text("author_address"),
  anonId: text("anon_id"),                      // first 12 chars of browser UUID for anon identity
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const tradesRelations = relations(trades, ({ many }) => ({
  logs: many(systemLogs),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  trade: one(trades, { fields: [systemLogs.relatedTradeId], references: [trades.id] }),
}));

export const forumPostsRelations = relations(forumPosts, ({ many }) => ({
  comments: many(forumComments),
}));

export const forumCommentsRelations = relations(forumComments, ({ one }) => ({
  post: one(forumPosts, { fields: [forumComments.postId], references: [forumPosts.id] }),
}));

// ─── Insert schemas & types ───────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

export const insertForumPostSchema = createInsertSchema(forumPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForumCommentSchema = createInsertSchema(forumComments).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export type InsertForumPost = z.infer<typeof insertForumPostSchema>;
export type ForumPost = typeof forumPosts.$inferSelect;

export type InsertForumComment = z.infer<typeof insertForumCommentSchema>;
export type ForumComment = typeof forumComments.$inferSelect;

export type TradeStatus = "DRAFT" | "LISTED" | "JOINED" | "ARMED" | "FUNDED" | "COMPLETED" | "CANCELLED";
export type LogType = "TRADE_EVENT" | "SECURITY" | "SYSTEM";
export type ForumPostType = "SELL" | "BUY_REQUEST" | "DISCUSSION" | "QA" | "PINNED";
