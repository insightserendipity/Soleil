import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careledgerRouter from "./careledger";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careledgerRouter);

export default router;
