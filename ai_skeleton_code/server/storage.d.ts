import { type User, type InsertUser, type Trade, type InsertTrade, type SystemLog, type InsertSystemLog, type ForumPost, type InsertForumPost, type ForumComment, type InsertForumComment, type ForumPostType } from "@shared/schema";
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
    seedForumPosts(): Promise<void>;
    getCommentsByPost(postId: string): Promise<ForumComment[]>;
    createComment(comment: InsertForumComment): Promise<ForumComment>;
    getUserByWalletOrCreate(walletAddress: string): Promise<User>;
    updateUserDisplayName(walletAddress: string, displayName: string): Promise<User | undefined>;
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
    getSystemLogs(): Promise<SystemLog[]>;
    getLogsByTrade(tradeId: string): Promise<SystemLog[]>;
    createLog(insertLog: InsertSystemLog): Promise<SystemLog>;
    getUserByWalletOrCreate(walletAddress: string): Promise<User>;
    updateUserDisplayName(walletAddress: string, displayName: string): Promise<User | undefined>;
    getForumPosts(type?: ForumPostType): Promise<ForumPost[]>;
    getForumPost(id: string): Promise<ForumPost | undefined>;
    createForumPost(post: InsertForumPost): Promise<ForumPost>;
    getCommentsByPost(postId: string): Promise<ForumComment[]>;
    createComment(comment: InsertForumComment): Promise<ForumComment>;
    seedForumPosts(): Promise<void>;
}
export declare const storage: DatabaseStorage;
