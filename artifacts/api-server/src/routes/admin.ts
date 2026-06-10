import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/admin/login", (req, res) => {
  // No password required - auto-authenticate
  res.json({ token: "admin-token" });
});

export default router;
