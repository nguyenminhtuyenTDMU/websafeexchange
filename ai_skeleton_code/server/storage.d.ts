import { type User, type InsertUser, type Trade, type InsertTrade, type Evidence, type InsertEvidence, type SystemLog, type InsertSystemLog } from "@shared/schema";
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
export declare class DatabaseStorage implements IStorage {
    getUser(id: string): Promise<User | undefined>;
    getUserByWallet(walletAddress: string): Promise<User | undefined>;
    createUser(insertUser: InsertUser): Promise<User>;
    getTrade(id: string): Promise<Trade | undefined>;
    getTradesBySeller(sellerAddress: string): Promise<Trade[]>;
    getTradesByBuyer(buyerAddress: string): Promise<Trade[]>;
    getTradeBySafeAddress(safeAddress: string): Promise<Trade | undefined>;
    getAllTrades(): Promise<Trade[]>;
    createTrade(insertTrade: InsertTrade): Promise<Trade>;
    updateTrade(id: string, data: Partial<Trade>): Promise<Trade | undefined>;
    getEvidence(id: string): Promise<Evidence | undefined>;
    getEvidenceByTrade(tradeId: string): Promise<Evidence[]>;
    getAllEvidence(): Promise<Evidence[]>;
    createEvidence(insertEvidence: InsertEvidence): Promise<Evidence>;
    getSystemLogs(): Promise<SystemLog[]>;
    getLogsByTrade(tradeId: string): Promise<SystemLog[]>;
    createLog(insertLog: InsertSystemLog): Promise<SystemLog>;
}
export declare const storage: DatabaseStorage;
