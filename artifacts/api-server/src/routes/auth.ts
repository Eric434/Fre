import { Router, type IRouter, type Request, type Response } from "express";
import { auth } from "../lib/auth";

const router: IRouter = Router();

// Mount Better Auth routes
// All auth endpoints will be accessible at /auth/*
router.all(/.*/, async (req: Request, res: Response) => {
  return auth.handler(req, res);
});

export default router;
