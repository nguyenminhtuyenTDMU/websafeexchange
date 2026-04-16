import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
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

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull().unique(),
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
  snapshotNonce: text("snapshot_nonce"),   // Safe.nonce() tại thời điểm armTrade
  status: tradeStatusEnum("status").default("DRAFT").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const evidence = pgTable("evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tradeId: varchar("trade_id").references(() => trades.id),
  hash: text("hash").notNull(),
  signerAddress: text("signer_address").notNull(),
  onchainTxHash: text("onchain_tx_hash"),
  payload: text("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: logTypeEnum("type").notNull(),
  message: text("message").notNull(),
  relatedTradeId: varchar("related_trade_id").references(() => trades.id),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tradesRelations = relations(trades, ({ many }) => ({
  evidence: many(evidence),
  logs: many(systemLogs),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  trade: one(trades, {
    fields: [evidence.tradeId],
    references: [trades.id],
  }),
}));

export const systemLogsRelations = relations(systemLogs, ({ one }) => ({
  trade: one(trades, {
    fields: [systemLogs.relatedTradeId],
    references: [trades.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  createdAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export type TradeStatus = "DRAFT" | "LISTED" | "JOINED" | "ARMED" | "FUNDED" | "COMPLETED" | "CANCELLED";
export type LogType = "TRADE_EVENT" | "SECURITY" | "SYSTEM";
