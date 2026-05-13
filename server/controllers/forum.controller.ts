import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertForumPostSchema, insertForumCommentSchema, type ForumPostType } from "@shared/schema";
import { requireSignature, validateEthAddress } from "../auth";

export const forumController = {
  getPosts: async (req: Request, res: Response) => {
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
  },

  createPost: async (req: Request, res: Response) => {
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

      // SELL / BUY_REQUEST: phải ký bằng ví để chứng minh identity
      const SIGNED_TYPES: string[] = ["SELL", "BUY_REQUEST"];
      if (SIGNED_TYPES.includes(data.type)) {
        if (!data.authorAddress) {
          return res.status(400).json({ error: "SELL/BUY_REQUEST yêu cầu kết nối ví (authorAddress)" });
        }
        const { error: authError } = await requireSignature(
          req,
          data.authorAddress,
          "create-forum-post",
          data.type.toLowerCase(),
        );
        if (authError) return res.status(401).json({ error: authError });
      }

      // SELL post: validate safeAddress và fetch on-chain snapshot
      if (data.type === "SELL") {
        if (data.safeAddress && !validateEthAddress(data.safeAddress)) {
          return res.status(400).json({ error: "safeAddress không hợp lệ" });
        }
        if (data.safeAddress) {
          try {
            const chainId = 11155111; // Sepolia default
            const safeRes = await fetch(
              `https://safe-transaction-sepolia.safe.global/api/v1/safes/${encodeURIComponent(data.safeAddress)}/`,
              { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) }
            );
            if (safeRes.ok) {
              const safeData = await safeRes.json();
              data.safeSnapshot = JSON.stringify({
                address: safeData.address,
                owners: safeData.owners,
                threshold: safeData.threshold,
                nonce: safeData.nonce,
                version: safeData.version,
                chainId,
                verifiedAt: new Date().toISOString(),
              });
            }
          } catch {
            // snapshot is optional — post still goes through without it
          }
        }
      }

      const post = await storage.createForumPost(data);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Dữ liệu không hợp lệ", details: error.errors });
      }
      res.status(500).json({ error: "Lỗi khi đăng bài" });
    }
  },

  getPost: async (req: Request, res: Response) => {
    try {
      const post = await storage.getForumPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Không tìm thấy bài đăng" });
      const comments = await storage.getCommentsByPost(post.id);
      res.json({ ...post, comments });
    } catch {
      res.status(500).json({ error: "Lỗi khi lấy bài đăng" });
    }
  },

  /**
   * DELETE /api/forum/posts/:id
   * Body: { authorAddress, signature, signedMessage }
   * signedMessage: "SafeExchange:delete-forum-post:{postId}:{isoTimestamp}"
   * Ký bởi authorAddress — chỉ tác giả mới xoá được
   */
  deletePost: async (req: Request, res: Response) => {
    try {
      const post = await storage.getForumPost(req.params.id);
      if (!post) return res.status(404).json({ error: "Không tìm thấy bài đăng" });

      if (post.isPinned) {
        return res.status(403).json({ error: "Không thể xoá bài ghim" });
      }

      const { authorAddress } = req.body;
      if (!validateEthAddress(authorAddress)) {
        return res.status(400).json({ error: "authorAddress không hợp lệ" });
      }
      if (post.authorAddress?.toLowerCase() !== authorAddress.toLowerCase()) {
        return res.status(403).json({ error: "Chỉ tác giả mới có thể xoá bài này" });
      }

      const { error: authError } = await requireSignature(
        req,
        authorAddress,
        "delete-forum-post",
        post.id,
      );
      if (authError) return res.status(401).json({ error: authError });

      await storage.deleteForumPost(post.id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Lỗi khi xoá bài đăng" });
    }
  },

  createComment: async (req: Request, res: Response) => {
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
  },
};
