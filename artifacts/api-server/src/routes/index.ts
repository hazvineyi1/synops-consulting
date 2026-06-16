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
import cadenceRouter from "./cadence";
import riseRouter from "./rise";
import meridianRouter from "./meridian";
import { requireAuth, requireProduct } from "../lib/auth";

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

// ── Compass curriculum engine (product-gated) ───────────────
// The engine endpoints below all belong to the Compass product. Gate them by
// their path prefixes (Express `use` does prefix matching) so users bound to
// "compass" (and admins) can reach them, while the other products' own routes
// (portal, cadence, rise) are left untouched. A pathless router-level gate would
// run before route matching and wrongly block every other product.
const COMPASS_ENGINE_PATHS = [
  "/dashboard",
  "/clients",
  "/projects",
  "/courses",
  "/modules",
  "/objectives",
  "/assessments",
  "/activities",
  "/standards-frameworks",
  "/crosswalk-links",
  "/qa-checks",
];
router.use(COMPASS_ENGINE_PATHS, requireProduct("compass"));

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

// ── Hub client portal + admin (self-gated per route) ────────
router.use(portalRouter);
router.use(adminRouter);

// ── Other product engines (self-gated with requireProduct) ──
router.use(cadenceRouter);
router.use(riseRouter);
router.use(meridianRouter);

export default router;
