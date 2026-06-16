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
import buildersRouter from "./builders";
import allocationsRouter from "./allocations";
import classesRouter from "./classes";
import schoolRouter from "./school";
import portalRouter from "./portal";
import adminRouter from "./admin";
import cadenceRouter from "./cadence";
import riseRouter from "./rise";
import meridianRouter from "./meridian";
import { requireAuth, requireProduct } from "../lib/auth";
import { loadActorContext } from "../lib/actor";

const router: IRouter = Router();

// ── Public routes ───────────────────────────────────────────
router.use(healthRouter);
router.use(authRouter);
router.use(contactRouter);
router.use(demoRouter);

// ── Compass curriculum engine (single guarded namespace) ────
// Every curriculum route lives under /compass behind ONE gate applied at the top
// of the engine router: authenticate, confirm the Compass product (admins and
// super-admins bypass), then load the actor's tenancy context. Because the gate
// sits above every mounted module, a route added inside the engine is always
// authenticated, product-gated, and org-aware. There is no way to register an
// ungated curriculum route here (the previous path-prefix allowlist could leave
// a new prefix wide open). See engine.safeguard.test.ts.
const engineRouter = Router();
engineRouter.use(requireAuth, requireProduct("compass"), loadActorContext);
engineRouter.use(dashboardRouter);
engineRouter.use(clientsRouter);
engineRouter.use(projectsRouter);
engineRouter.use(coursesRouter);
engineRouter.use(objectivesRouter);
engineRouter.use(assessmentsRouter);
engineRouter.use(ledgerRouter);
engineRouter.use(qaRouter);
engineRouter.use(standardsRouter);
engineRouter.use(intakeRouter);
engineRouter.use(buildersRouter);
engineRouter.use(allocationsRouter);
engineRouter.use(classesRouter);
engineRouter.use(schoolRouter);
router.use("/compass", engineRouter);

// ── Authenticated routes ────────────────────────────────────
// Everything below requires a valid session. Admin endpoints additionally
// enforce the admin role within their own handlers; the other product engines
// self-gate per-router with requireProduct.
router.use(requireAuth);

// ── Hub client portal + admin (self-gated per route) ────────
router.use(portalRouter);
router.use(adminRouter);

// ── Other product engines (self-gated with requireProduct) ──
router.use(cadenceRouter);
router.use(riseRouter);
router.use(meridianRouter);

export default router;
