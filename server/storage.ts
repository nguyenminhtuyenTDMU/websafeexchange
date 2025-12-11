import { db } from "./db";
import { eq, desc, and, not, inArray } from "drizzle-orm";
import { 
  users, trades, evidence, systemLogs,
  type User, type InsertUser,
  type Trade, type InsertTrade,
  type Evidence, type InsertEvidence,
  type SystemLog, type InsertSystemLog,
  type TradeStatus
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
  
  getEvidence(id: string): Promise<Evidence | undefined>;
  getEvidenceByTrade(tradeId: string): Promise<Evidence[]>;
  getAllEvidence(): Promise<Evidence[]>;
  createEvidence(evidence: InsertEvidence): Promise<Evidence>;

  getSystemLogs(): Promise<SystemLog[]>;
  getLogsByTrade(tradeId: string): Promise<SystemLog[]>;
  createLog(log: InsertSystemLog): Promise<SystemLog>;
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

  async getEvidence(id: string): Promise<Evidence | undefined> {
    const [ev] = await db.select().from(evidence).where(eq(evidence.id, id)).limit(1);
    return ev;
  }

  async getEvidenceByTrade(tradeId: string): Promise<Evidence[]> {
    return db.select().from(evidence)
      .where(eq(evidence.tradeId, tradeId))
      .orderBy(desc(evidence.createdAt));
  }

  async getAllEvidence(): Promise<Evidence[]> {
    return db.select().from(evidence).orderBy(desc(evidence.createdAt));
  }

  async createEvidence(insertEvidence: InsertEvidence): Promise<Evidence> {
    const [ev] = await db.insert(evidence)
      .values({
        ...insertEvidence,
        signerAddress: insertEvidence.signerAddress.toLowerCase(),
      })
      .returning();
    return ev;
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
}

export const storage = new DatabaseStorage();
