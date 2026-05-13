import type { Request, Response } from "express";
import { storage } from "../storage";
import { requireSignature, validateEthAddress } from "../auth";

export const userController = {
  getProfile: async (req: Request, res: Response) => {
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
  },

  /**
   * PATCH /api/users/profile
   * Body: { address, displayName, signature, signedMessage }
   * signedMessage: "SafeExchange:update-profile:{address}:{isoTimestamp}"
   * Ký bởi address — chứng minh quyền sở hữu ví
   */
  updateProfile: async (req: Request, res: Response) => {
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
  },
};
