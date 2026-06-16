import {
  LayoutDashboard,
  KanbanSquare,
  GraduationCap,
  Compass as CompassIcon,
  Stethoscope,
  Sparkles,
  CalendarClock,
  Activity,
  ShieldCheck,
  HeartPulse,
  type LucideIcon,
} from "lucide-react";

export type ProductVertical = "Education" | "Healthcare" | "Project Management";
export type ProductStatus = "live" | "roadmap";

export interface Product {
  /** URL slug and DB product_key. */
  key: string;
  /** Short brand name, e.g. "Rise". */
  name: string;
  /** Descriptive title, e.g. "Adaptive Learning Platform". */
  title: string;
  vertical: ProductVertical;
  status: ProductStatus;
  /** One-sentence description for directories and placeholders. */
  blurb: string;
  /** Marketing line shown on the branded login side panel. */
  panelLine: string;
  /** Brand accent color (hex). Chosen dark enough for white text (WCAG AA). */
  accent: string;
  icon: LucideIcon;
  /** Whether self-service registration is offered for this product. */
  hasRegister: boolean;
  /** Planned capabilities shown on a roadmap product's "in development" page. */
  planned?: string[];
  /** When true, the workspace shows a synthetic-data, no-PHI notice. */
  noPhi?: boolean;
}

export const PRODUCTS: Product[] = [
  {
    key: "hub",
    name: "Hub",
    title: "Client Portal",
    vertical: "Project Management",
    status: "live",
    blurb:
      "Your authenticated client workspace: engagements, shared resources, and requests in one place.",
    panelLine:
      "Track engagements, reach your project team, and find shared resources in one secure workspace.",
    accent: "#4f46e5",
    icon: LayoutDashboard,
    hasRegister: true,
  },
  {
    key: "cadence",
    name: "Cadence",
    title: "Engagement Command Center",
    vertical: "Project Management",
    status: "live",
    blurb:
      "PMP-based project, milestone, and deliverable tracking with QA gates.",
    panelLine:
      "Run every engagement with milestones, deliverables, and QA gates that hold the line on quality.",
    accent: "#7c3aed",
    icon: KanbanSquare,
    hasRegister: false,
  },
  {
    key: "rise",
    name: "Rise",
    title: "Adaptive Learning Platform",
    vertical: "Education",
    status: "live",
    blurb:
      "Level-aware adaptive reading and reasoning with live mastery tracking.",
    panelLine:
      "Adaptive reading and reasoning that meets every learner at the right level and adjusts on each answer.",
    accent: "#047857",
    icon: GraduationCap,
    hasRegister: false,
  },
  {
    key: "compass",
    name: "Compass",
    title: "Curriculum Engine",
    vertical: "Education",
    status: "live",
    blurb:
      "Standards-aligned course and curriculum generation with a built-in accessibility QA checker.",
    panelLine:
      "Design standards-aligned curriculum with quality and accessibility checks built into every step.",
    accent: "#1d4ed8",
    icon: CompassIcon,
    hasRegister: false,
  },
  {
    key: "meridian",
    name: "Meridian",
    title: "Provider Operations Portal",
    vertical: "Healthcare",
    status: "live",
    blurb:
      "Provider relations and network-adequacy workflow with dispute and escalation tracking.",
    panelLine:
      "Manage provider relations, monitor network adequacy, and resolve disputes from one operations hub.",
    accent: "#0f766e",
    icon: Stethoscope,
    hasRegister: false,
  },
  {
    key: "spark",
    name: "Spark",
    title: "Socratic Reasoning Tutor",
    vertical: "Education",
    status: "roadmap",
    blurb:
      "Guided Socratic dialogue that asks probing questions instead of giving answers.",
    panelLine:
      "A reasoning tutor that guides with questions, not answers, and scores engagement as it goes.",
    accent: "#b45309",
    icon: Sparkles,
    hasRegister: false,
    planned: [
      "Guided Socratic questioning that adapts to each response",
      "Reasoning-quality scoring without giving away answers",
      "Session transcripts for instructor review",
    ],
  },
  {
    key: "aria",
    name: "Aria",
    title: "Study Coach",
    vertical: "Education",
    status: "roadmap",
    blurb: "Spaced repetition paired with a self-regulated-learning planner.",
    panelLine:
      "Plan study sessions and schedule reviews with spaced repetition built for self-regulated learning.",
    accent: "#be185d",
    icon: CalendarClock,
    hasRegister: false,
    planned: [
      "Spaced-repetition scheduling across topics",
      "Self-regulated-learning planner with goals",
      "Review reminders and study queues",
    ],
  },
  {
    key: "pulse",
    name: "Pulse",
    title: "Instructor Command Center",
    vertical: "Education",
    status: "roadmap",
    blurb: "Learning-analytics dashboard for engagement, gaps, and progress.",
    panelLine:
      "See engagement, gaps, and progress across every learner in one analytics command center.",
    accent: "#0e7490",
    icon: Activity,
    hasRegister: false,
    planned: [
      "Engagement and progress analytics by cohort",
      "Gap detection across learning objectives",
      "Exportable class and learner reports",
    ],
  },
  {
    key: "sentinel",
    name: "Sentinel",
    title: "Compliance & Quality Tracker",
    vertical: "Healthcare",
    status: "roadmap",
    blurb: "NCQA and regulatory-readiness checklists with audit logging.",
    panelLine:
      "Track NCQA and regulatory readiness with structured checklists and a complete audit trail.",
    accent: "#334155",
    icon: ShieldCheck,
    hasRegister: false,
    planned: [
      "NCQA and regulatory readiness checklists",
      "Evidence attachments per requirement",
      "Full audit logging of every change",
    ],
  },
  {
    key: "tend",
    name: "Tend",
    title: "Care Coordination Tool",
    vertical: "Healthcare",
    status: "roadmap",
    blurb:
      "Health-risk-assessment intake and care-coordination workflow. Synthetic data only, no PHI.",
    panelLine:
      "Coordinate care from intake to follow-up. Built as workflow only, with no PHI until a HIPAA environment is in place.",
    accent: "#15803d",
    icon: HeartPulse,
    hasRegister: false,
    noPhi: true,
    planned: [
      "Health-risk-assessment intake forms",
      "Care-coordination task workflow",
      "Referral and follow-up tracking",
    ],
  },
];

export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.key, p]),
);

export function getProduct(key?: string | null): Product | undefined {
  if (!key) return undefined;
  return PRODUCT_MAP[key];
}

export const LIVE_PRODUCTS = PRODUCTS.filter((p) => p.status === "live");
export const ROADMAP_PRODUCTS = PRODUCTS.filter((p) => p.status === "roadmap");
