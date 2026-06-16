import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import contactRouter from "./contact";
import demoRouter from "./demo";
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
import portalRouter from "./portal";
import adminRouter from "./admin";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// ── Public routes ───────────────────────────────────────────
router.use(healthRouter);
router.use(authRouter);
router.use(contactRouter);
router.use(demoRouter);

// ── Authenticated routes ────────────────────────────────────
// Everything below requires a valid session (the gated curriculum portal +
// engine, plus client-portal endpoints). Admin endpoints additionally enforce
// the admin role within their own handlers.
router.use(requireAuth);
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
router.use(portalRouter);
router.use(adminRouter);

export default router;
