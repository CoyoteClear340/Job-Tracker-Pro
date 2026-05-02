import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import gmailRouter from "./gmail";
import alertsRouter from "./alerts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);
router.use(gmailRouter);
router.use(alertsRouter);

export default router;
