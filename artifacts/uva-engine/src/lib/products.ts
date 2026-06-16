import {
  LayoutDashboard,
  KanbanSquare,
  GraduationCap,
  Compass as CompassIcon,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export type ProductVertical = "Education" | "Healthcare" | "Project Management";

export interface Product {
  /** URL slug and DB product_key. */
  key: string;
  /** Short brand name, e.g. "Rise". */
  name: string;
  /** Descriptive title, e.g. "Adaptive Learning Platform". */
  title: string;
  vertical: ProductVertical;
  /** One-sentence description for the public portals directory. */
  blurb: string;
  /** Marketing line shown on the branded login side panel. */
  panelLine: string;
  /** Brand accent color (hex). Chosen dark enough for white text (WCAG AA). */
  accent: string;
  icon: LucideIcon;
  /** Whether self-service registration is offered for this product. */
  hasRegister: boolean;
}

export const PRODUCTS: Product[] = [
  {
    key: "hub",
    name: "Hub",
    title: "Client Portal",
    vertical: "Project Management",
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
    blurb:
      "Provider relations and network-adequacy workflow with dispute and escalation tracking.",
    panelLine:
      "Manage provider relations, monitor network adequacy, and resolve disputes from one operations hub.",
    accent: "#0f766e",
    icon: Stethoscope,
    hasRegister: false,
  },
];

export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(
  PRODUCTS.map((p) => [p.key, p]),
);

export function getProduct(key?: string | null): Product | undefined {
  if (!key) return undefined;
  return PRODUCT_MAP[key];
}
