import { db, portalResourcesTable } from "@workspace/db";

interface MinimalLogger {
  info: (obj: object, msg?: string) => void;
}

const SAMPLE_RESOURCES = [
  {
    title: "Engagement Playbook",
    category: "Guides",
    description:
      "How we run every engagement: Assess → Design → Build → Sustain, with the artifacts you receive at each stage.",
    url: "#",
  },
  {
    title: "Accessibility & Compliance Checklist",
    category: "Templates",
    description:
      "Our WCAG 2.1 AA and Section 508 review checklist, used on every learning deliverable.",
    url: "#",
  },
  {
    title: "Quality Review Rubric",
    category: "Templates",
    description:
      "The course and curriculum review rubric we crosswalk against recognized quality standards.",
    url: "#",
  },
  {
    title: "Sample Quarterly Status Report",
    category: "Reports",
    description:
      "An example of the cadence, metrics, and format we deliver to engagement sponsors.",
    url: "#",
  },
];

/** Idempotently seed sample portal resources if none exist yet. */
export async function ensurePortalSeed(log: MinimalLogger): Promise<void> {
  const existing = await db.select().from(portalResourcesTable).limit(1);
  if (existing.length > 0) return;
  await db.insert(portalResourcesTable).values(SAMPLE_RESOURCES);
  log.info({ count: SAMPLE_RESOURCES.length }, "Seeded sample portal resources");
}
