import type { Express } from "express";
import type { Server } from "http";
import { eventBroadcaster } from "./websocket";
import { tradeController } from "./controllers/trade.controller";
import { forumController } from "./controllers/forum.controller";
import { safeController } from "./controllers/safe.controller";
import { logController } from "./controllers/log.controller";
import { userController } from "./controllers/user.controller";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  eventBroadcaster.initialize(httpServer);

  // ─── Trades ──────────────────────────────────────────────────────────────────
  app.get("/api/trades",            tradeController.getAll);
  app.get("/api/trades/search",     tradeController.search);
  app.get("/api/trades/:id",        tradeController.getById);
  app.post("/api/trades",           tradeController.create);
  app.post("/api/trades/:id/join",  tradeController.join);
  app.post("/api/trades/:id/arm",   tradeController.arm);
  app.post("/api/trades/:id/deposit",  tradeController.deposit);
  app.post("/api/trades/:id/complete", tradeController.complete);
  app.post("/api/trades/:id/cancel",   tradeController.cancel);

  // ─── Safe info proxy ─────────────────────────────────────────────────────────
  app.get("/api/safe-info", safeController.getInfo);

  // ─── Logs ────────────────────────────────────────────────────────────────────
  app.get("/api/logs", logController.getLogs);

  // ─── Forum ───────────────────────────────────────────────────────────────────
  app.get("/api/forum/posts",               forumController.getPosts);
  app.post("/api/forum/posts",              forumController.createPost);
  app.get("/api/forum/posts/:id",           forumController.getPost);
  app.delete("/api/forum/posts/:id",        forumController.deletePost);
  app.post("/api/forum/posts/:id/comments", forumController.createComment);

  // ─── Users ───────────────────────────────────────────────────────────────────
  app.get("/api/users/profile",   userController.getProfile);
  app.patch("/api/users/profile", userController.updateProfile);

  return httpServer;
}
