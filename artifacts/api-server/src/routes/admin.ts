import { Router, type IRouter } from "express";
import { requireAdmin } from "../lib/adminAuth";

const router: IRouter = Router();

router.post("/admin/login", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ token: process.env.ADMIN_PASSWORD });
});

router.post("/admin/change-password", requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new passwords are required" });
    return;
  }

  if (currentPassword !== process.env.ADMIN_PASSWORD) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  if (newPassword.length < 8) {
    res
      .status(400)
      .json({ error: "New password must be at least 8 characters long" });
    return;
  }

  process.env.ADMIN_PASSWORD = newPassword;
  res.json({ success: true, message: "Password changed successfully" });
});

export default router;
