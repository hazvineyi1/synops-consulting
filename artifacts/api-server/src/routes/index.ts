import { Router, type IRouter } from "express";
import healthRouter from "./health";
import clientsRouter from "./clients";
import projectsRouter from "./projects";
import coursesRouter from "./courses";
import objectivesRouter from "./objectives";
import assessmentsRouter from "./assessments";
import ledgerRouter from "./ledger";
import qaRouter from "./qa";
import standardsRouter from "./standards";
import dashboardRouter from "./dashboard";
import intakeRouter from "./intake";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(projectsRouter);
router.use(coursesRouter);
router.use(objectivesRouter);
router.use(assessmentsRouter);
router.use(ledgerRouter);
router.use(qaRouter);
router.use(standardsRouter);
router.use(intakeRouter);

export default router;
