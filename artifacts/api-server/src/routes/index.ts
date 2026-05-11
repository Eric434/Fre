import { Router, type IRouter } from "express";
import healthRouter from "./health";
import notifyRouter from "./notify";
import packagesRouter from "./packages";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(packagesRouter);
router.use(notifyRouter);

export default router;
