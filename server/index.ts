import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startSafeWatcher } from "./safe-watcher";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// ─── CORS ──────────────────────────────────────────────────────────────────────
// Chỉ cho phép frontend origin truy cập API.
// Railway tự inject RAILWAY_PUBLIC_DOMAIN; fallback về localhost khi dev.
const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
const defaultOrigin = railwayDomain
  ? `https://${railwayDomain}`
  : "http://localhost:5000";
const ALLOWED_ORIGINS = [
  defaultOrigin,
  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép server-to-server (không có origin) và các origin đã whitelist
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        const err = new Error(`CORS: origin "${origin}" không được phép`) as any;
        err.status = 403;
        callback(err);
      }
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 600, // preflight cache 10 phút
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────────────────────

// Giới hạn chung cho tất cả API: 200 req / 15 phút mỗi IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu, vui lòng thử lại sau." },
});

// Giới hạn chặt cho các endpoint ghi (state-mutation): 30 req / 15 phút mỗi IP
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Quá nhiều yêu cầu ghi, vui lòng thử lại sau." },
});

// Giới hạn forum để chống spam: 10 bài / 15 phút mỗi IP
const forumWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Đăng bài quá nhanh, vui lòng thử lại sau." },
});

app.use("/api", generalLimiter);
app.post("/api/trades", writeLimiter);          // chỉ giới hạn tạo trade mới
app.post("/api/forum/posts", forumWriteLimiter); // chỉ POST, không áp cho GET

// ─── Body parsing ──────────────────────────────────────────────────────────────

app.use(
  express.json({
    limit: "50kb", // ngăn payload DoS
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// ─── Request logging ───────────────────────────────────────────────────────────

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// ─── Routes & startup ─────────────────────────────────────────────────────────

(async () => {
  await registerRoutes(httpServer, app);
  startSafeWatcher();
  storage.seedForumPosts().catch((err) => console.error("[seed] forum posts error:", err));

  // Lỗi chung — không lộ stack trace ra ngoài trong production
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message =
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    res.status(status).json({ message });

    if (process.env.NODE_ENV !== "production") {
      throw err;
    }
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };

  if (process.platform !== "win32") {
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
