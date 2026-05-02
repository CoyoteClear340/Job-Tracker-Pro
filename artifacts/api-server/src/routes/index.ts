import { Router, type IRouter } from "express";
import healthRouter from "./health";
import applicationsRouter from "./applications";
import gmailRouter from "./gmail";
import alertsRouter from "./alerts";
import scamRulesRouter from "./scam-rules";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);
router.use(gmailRouter);
router.use(alertsRouter);
router.use(scamRulesRouter);
router.use(notificationsRouter);

export default router;
