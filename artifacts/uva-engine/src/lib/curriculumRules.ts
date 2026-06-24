// Deterministic, rules-based curriculum quality engine that powers the public
// Curriculum Builder demo (intake -> design -> QA -> handoff).
//
// Everything here is a pure function of the curriculum the visitor builds: no
// network, no secrets, no randomness. That keeps the demo instant, repeatable,
// and free of any new public attack surface, while still running the same kind
// of standards / measurability / alignment / accessibility checks the real
// Compass QA stage performs.

export type Severity = "pass" | "warn" | "fail";

export type RuleCategory =
  | "measurability"
  | "standards"
  | "assessment"
  | "clarity"
  | "structure";

export const RULE_CATEGORY_LABELS: Record<RuleCategory, string> = {
  measurability: "Measurable outcomes",
  standards: "Standards alignment",
  assessment: "Assessment coverage",
  clarity: "Clarity and accessibility",
  structure: "Course structure",
};

export const BLOOM_LEVELS = [
  "Remember",
  "Understand",
  "Apply",
  "Analyze",
  "Evaluate",
  "Create",
] as const;
export type BloomLevel = (typeof BLOOM_LEVELS)[number];

const BLOOM_VERBS: Record<BloomLevel, string[]> = {
  Remember: [
    "define", "list", "identify", "name", "recall", "label", "recognize",
    "state", "match", "repeat", "record", "select",
  ],
  Understand: [
    "explain", "summarize", "classify", "compare", "interpret", "paraphrase",
    "describe", "discuss", "illustrate", "translate", "restate", "report",
  ],
  Apply: [
    "apply", "demonstrate", "solve", "use", "calculate", "implement", "compute",
    "execute", "model", "operate", "modify", "graph",
  ],
  Analyze: [
    "analyze", "differentiate", "organize", "examine", "contrast", "investigate",
    "categorize", "deconstruct", "distinguish", "outline", "diagram",
  ],
  Evaluate: [
    "evaluate", "critique", "judge", "assess", "justify", "defend", "argue",
    "appraise", "rank", "prioritize", "recommend", "validate",
  ],
  Create: [
    "create", "design", "construct", "develop", "formulate", "produce",
    "compose", "plan", "generate", "build", "devise", "propose",
  ],
};

// Non-observable verbs that cannot be directly measured and should be rewritten.
const VAGUE_VERBS = new Set([
  "understand", "know", "learn", "appreciate", "comprehend", "grasp", "realize",
  "value", "believe", "internalize", "cover", "study", "familiarize", "explore",
  "consider", "think",
]);

// Multi-word stems that wrap an objective before the real action verb.
const LEADING_STEMS = [
  /^by the end of (this|the) (course|unit|lesson|module|term)[,:]?\s*/,
  /^the (learner|student)s?\s+will be able to\s+/,
  /^the (learner|student)s?\s+will\s+/,
  /^(learner|student)s?\s+will be able to\s+/,
  /^(learner|student)s?\s+will\s+/,
  /^swbat\s+/,
  /^be able to\s+/,
  /^able to\s+/,
  /^to\s+/,
];

// Multi-word vague phrases that imply a non-measurable outcome.
const VAGUE_PHRASES = [
  "be aware of",
  "become familiar with",
  "be familiar with",
  "gain an understanding of",
  "gain knowledge of",
  "have knowledge of",
  "develop an appreciation",
];

const MEASURABLE_VERB_SUGGESTION =
  "Rewrite with an observable verb such as explain, analyze, apply, evaluate, or design.";

export interface DemoStandard {
  id: string;
  framework: string;
  code: string;
  label: string;
}

// A small, realistic standards picklist grouped by framework. Curated so the
// demo reads like a real cross-framework course without needing a live catalog.
// Frameworks span accreditation (nursing), workforce, and K-12 so the demo can
// tailor itself to the visitor's sector.
export const DEMO_STANDARDS: DemoStandard[] = [
  // Nursing accreditation: AACN Essentials, as reviewed for CCNE accreditation.
  { id: "ccne-d1", framework: "Nursing (CCNE)", code: "Domain 1", label: "Knowledge for nursing practice" },
  { id: "ccne-d2", framework: "Nursing (CCNE)", code: "Domain 2", label: "Person-centered care" },
  { id: "ccne-d5", framework: "Nursing (CCNE)", code: "Domain 5", label: "Quality and safety" },
  { id: "ccne-d6", framework: "Nursing (CCNE)", code: "Domain 6", label: "Interprofessional partnerships" },
  { id: "ccne-d8", framework: "Nursing (CCNE)", code: "Domain 8", label: "Informatics and healthcare technologies" },
  // Nursing accreditation: ACEN standards and end-of-program outcomes.
  { id: "acen-curriculum", framework: "Nursing (ACEN)", code: "Std 4", label: "Curriculum aligned to professional nursing standards" },
  { id: "acen-outcomes", framework: "Nursing (ACEN)", code: "Std 6", label: "End-of-program student learning outcomes" },
  // Workforce and professional development.
  { id: "atd-id", framework: "Workforce (ATD)", code: "ATD", label: "Instructional design and learning sciences" },
  { id: "atd-pc", framework: "Workforce (ATD)", code: "ATD", label: "Performance improvement and consulting" },
  { id: "shrm-lead", framework: "Leadership (SHRM)", code: "SHRM", label: "Leadership and navigation" },
  { id: "shrm-comm", framework: "Leadership (SHRM)", code: "SHRM", label: "Communication" },
  // K-12 frameworks.
  { id: "ccss-rst-9-10-7", framework: "ELA (CCSS)", code: "RST.9-10.7", label: "Translate technical information expressed in words and visuals" },
  { id: "ccss-ri-9-10-1", framework: "ELA (CCSS)", code: "RI.9-10.1", label: "Cite strong textual evidence to support analysis" },
  { id: "ccss-hss-id-a-2", framework: "Math (CCSS)", code: "HSS.ID.A.2", label: "Use statistics to compare center and spread of data sets" },
  { id: "ccss-hsf-if-b-4", framework: "Math (CCSS)", code: "HSF.IF.B.4", label: "Interpret key features of graphs and tables" },
  { id: "iste-1-5", framework: "Technology (ISTE)", code: "1.5", label: "Computational Thinker" },
  { id: "iste-1-3", framework: "Technology (ISTE)", code: "1.3", label: "Knowledge Constructor" },
  { id: "ngss-hs-ets1-2", framework: "Science (NGSS)", code: "HS-ETS1-2", label: "Design a solution to a complex real-world problem" },
];

export const DEMO_STANDARD_MAP: Record<string, DemoStandard> = Object.fromEntries(
  DEMO_STANDARDS.map((s) => [s.id, s]),
);

export type AssessmentType = "formative" | "summative";

export interface DemoObjective {
  id: string;
  text: string;
  standardId: string | null;
}

export interface DemoAssessment {
  id: string;
  title: string;
  type: AssessmentType;
  objectiveIds: string[];
}

export interface DemoCourse {
  title: string;
  gradeBand: string;
  termWeeks: number | null;
  objectives: DemoObjective[];
  assessments: DemoAssessment[];
}

export interface VerbDetection {
  verb: string | null;
  bloomLevel: BloomLevel | null;
  kind: "measurable" | "vague" | "missing";
  suggestion?: string;
}

/**
 * Inspect an objective's wording and classify its action verb. Strips common
 * objective stems ("Students will be able to ...") first, then matches the
 * leading verb against Bloom's taxonomy or the non-measurable verb list.
 */
export function detectVerb(rawText: string): VerbDetection {
  let text = rawText.trim().toLowerCase().replace(/\s+/g, " ");
  if (!text) return { verb: null, bloomLevel: null, kind: "missing" };

  // Strip wrapping stems repeatedly (e.g. "By the end of the unit, students will be able to").
  let changed = true;
  while (changed) {
    changed = false;
    for (const stem of LEADING_STEMS) {
      const next = text.replace(stem, "");
      if (next !== text) {
        text = next.trim();
        changed = true;
      }
    }
  }

  for (const phrase of VAGUE_PHRASES) {
    if (text.startsWith(phrase)) {
      return {
        verb: phrase,
        bloomLevel: null,
        kind: "vague",
        suggestion: MEASURABLE_VERB_SUGGESTION,
      };
    }
  }

  const firstWord = text.split(" ")[0]?.replace(/[^a-z]/g, "") ?? "";
  if (!firstWord) return { verb: null, bloomLevel: null, kind: "missing" };

  for (const level of BLOOM_LEVELS) {
    if (BLOOM_VERBS[level].includes(firstWord)) {
      return { verb: firstWord, bloomLevel: level, kind: "measurable" };
    }
  }

  if (VAGUE_VERBS.has(firstWord)) {
    return {
      verb: firstWord,
      bloomLevel: null,
      kind: "vague",
      suggestion: MEASURABLE_VERB_SUGGESTION,
    };
  }

  return {
    verb: firstWord,
    bloomLevel: null,
    kind: "missing",
    suggestion:
      "No recognized measurable verb at the start of the outcome. Lead with an observable action verb.",
  };
}

// A measurable criterion: a number, percentage, or a degree phrase.
const CRITERION_PATTERN =
  /(\d+\s?%|\d+\s+(of|out)|at least|with \d|accuracy|within|minimum|score of|by .* points|in under)/i;

export interface ObjectiveAnalysis {
  objectiveId: string;
  text: string;
  detection: VerbDetection;
  wordCount: number;
  hasCriterion: boolean;
  compound: boolean;
  standardId: string | null;
  assessmentCount: number;
}

export interface QaFinding {
  id: string;
  severity: Severity;
  category: RuleCategory;
  targetType: "course" | "objective" | "assessment";
  targetId?: string;
  targetLabel: string;
  message: string;
  remediation?: string;
}

export interface CategoryScore {
  category: RuleCategory;
  passed: number;
  total: number;
  score: number;
}

export interface QaReport {
  findings: QaFinding[];
  score: number;
  categoryScores: CategoryScore[];
  counts: { pass: number; warn: number; fail: number };
  bloomDistribution: { level: BloomLevel; count: number }[];
  objectiveAnalyses: ObjectiveAnalysis[];
}

const SEVERITY_WEIGHT: Record<Severity, number> = { pass: 1, warn: 0.5, fail: 0 };

function truncate(text: string, max = 56): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}...` : t;
}

/** Analyze one objective in the context of the whole course. */
export function analyzeObjective(
  objective: DemoObjective,
  assessments: DemoAssessment[],
): ObjectiveAnalysis {
  const detection = detectVerb(objective.text);
  const trimmed = objective.text.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).length : 0;
  const assessmentCount = assessments.filter((a) =>
    a.objectiveIds.includes(objective.id),
  ).length;
  // A compound objective joins two outcomes with "and" / "as well as".
  const compound = /\b(and|as well as)\b/i.test(trimmed) && wordCount > 12;
  return {
    objectiveId: objective.id,
    text: trimmed,
    detection,
    wordCount,
    hasCriterion: CRITERION_PATTERN.test(trimmed),
    compound,
    standardId: objective.standardId,
    assessmentCount,
  };
}

/**
 * Run the full rules engine over a course and return a structured QA report:
 * findings, per-category scores, an overall score, and a Bloom distribution.
 */
export function evaluateCourse(course: DemoCourse): QaReport {
  const findings: QaFinding[] = [];
  const analyses = course.objectives.map((o) =>
    analyzeObjective(o, course.assessments),
  );

  // Structure (course-level).
  findings.push(
    course.title.trim().length >= 3
      ? {
          id: "structure-title",
          severity: "pass",
          category: "structure",
          targetType: "course",
          targetLabel: "Course title",
          message: "Course has a descriptive title.",
        }
      : {
          id: "structure-title",
          severity: "fail",
          category: "structure",
          targetType: "course",
          targetLabel: "Course title",
          message: "Course is missing a title.",
          remediation: "Add a clear, descriptive course title in the Intake step.",
        },
  );

  findings.push(
    course.objectives.length >= 2
      ? {
          id: "structure-objectives",
          severity: "pass",
          category: "structure",
          targetType: "course",
          targetLabel: "Learning outcomes",
          message: `Course defines ${course.objectives.length} learning outcomes.`,
        }
      : {
          id: "structure-objectives",
          severity: course.objectives.length === 1 ? "warn" : "fail",
          category: "structure",
          targetType: "course",
          targetLabel: "Learning outcomes",
          message:
            course.objectives.length === 1
              ? "Only one learning outcome is defined."
              : "No learning outcomes are defined.",
          remediation: "Add learning outcomes in the Design step (aim for three to six).",
        },
  );

  findings.push(
    course.assessments.length >= 1
      ? {
          id: "structure-assessments",
          severity: "pass",
          category: "structure",
          targetType: "course",
          targetLabel: "Assessments",
          message: `Course defines ${course.assessments.length} assessments.`,
        }
      : {
          id: "structure-assessments",
          severity: "fail",
          category: "structure",
          targetType: "course",
          targetLabel: "Assessments",
          message: "No assessments are defined.",
          remediation: "Add at least one assessment and align it to your outcomes.",
        },
  );

  // Per-objective checks.
  for (const a of analyses) {
    const label = truncate(a.text || "Untitled outcome");

    // Measurability.
    if (a.detection.kind === "measurable") {
      findings.push({
        id: `measure-${a.objectiveId}`,
        severity: "pass",
        category: "measurability",
        targetType: "objective",
        targetId: a.objectiveId,
        targetLabel: label,
        message: `Measurable verb "${a.detection.verb}" (Bloom: ${a.detection.bloomLevel}).`,
      });
    } else if (a.detection.kind === "vague") {
      findings.push({
        id: `measure-${a.objectiveId}`,
        severity: "fail",
        category: "measurability",
        targetType: "objective",
        targetId: a.objectiveId,
        targetLabel: label,
        message: `Verb "${a.detection.verb}" is not observable or measurable.`,
        remediation: a.detection.suggestion ?? MEASURABLE_VERB_SUGGESTION,
      });
    } else {
      findings.push({
        id: `measure-${a.objectiveId}`,
        severity: "warn",
        category: "measurability",
        targetType: "objective",
        targetId: a.objectiveId,
        targetLabel: label,
        message: "No recognized measurable action verb at the start of the outcome.",
        remediation:
          a.detection.suggestion ??
          "Begin the outcome with an observable verb such as explain or design.",
      });
    }

    // Standards alignment.
    findings.push(
      a.standardId
        ? {
            id: `standard-${a.objectiveId}`,
            severity: "pass",
            category: "standards",
            targetType: "objective",
            targetId: a.objectiveId,
            targetLabel: label,
            message: `Mapped to ${DEMO_STANDARD_MAP[a.standardId]?.framework ?? "a framework"} ${DEMO_STANDARD_MAP[a.standardId]?.code ?? ""}.`.trim(),
          }
        : {
            id: `standard-${a.objectiveId}`,
            severity: "fail",
            category: "standards",
            targetType: "objective",
            targetId: a.objectiveId,
            targetLabel: label,
            message: "Outcome is not mapped to any framework standard.",
            remediation: "Map the outcome to a standard, or tag it as enrichment.",
          },
    );

    // Assessment coverage.
    findings.push(
      a.assessmentCount > 0
        ? {
            id: `assess-${a.objectiveId}`,
            severity: "pass",
            category: "assessment",
            targetType: "objective",
            targetId: a.objectiveId,
            targetLabel: label,
            message: `Measured by ${a.assessmentCount} assessment${a.assessmentCount === 1 ? "" : "s"}.`,
          }
        : {
            id: `assess-${a.objectiveId}`,
            severity: "fail",
            category: "assessment",
            targetType: "objective",
            targetId: a.objectiveId,
            targetLabel: label,
            message: "No assessment measures this outcome.",
            remediation: "Add or link an assessment that evaluates this outcome.",
          },
    );

    // Clarity and accessibility (advisory).
    if (a.compound) {
      findings.push({
        id: `clarity-compound-${a.objectiveId}`,
        severity: "warn",
        category: "clarity",
        targetType: "objective",
        targetId: a.objectiveId,
        targetLabel: label,
        message: "Outcome may combine two outcomes in one statement.",
        remediation: "Split into separate single-focus outcomes so each can be assessed.",
      });
    } else if (a.wordCount > 28) {
      findings.push({
        id: `clarity-length-${a.objectiveId}`,
        severity: "warn",
        category: "clarity",
        targetType: "objective",
        targetId: a.objectiveId,
        targetLabel: label,
        message: `Outcome is long (${a.wordCount} words), which can reduce readability.`,
        remediation: "Tighten the wording for a clearer, more accessible outcome.",
      });
    } else if (a.text.length > 0) {
      findings.push({
        id: `clarity-${a.objectiveId}`,
        severity: "pass",
        category: "clarity",
        targetType: "objective",
        targetId: a.objectiveId,
        targetLabel: label,
        message: a.hasCriterion
          ? "Concise and includes a measurable criterion."
          : "Concise and readable.",
      });
    }
  }

  // Orphan assessments: defined but not aligned to any outcome.
  for (const assessment of course.assessments) {
    const linked = assessment.objectiveIds.filter((id) =>
      course.objectives.some((o) => o.id === id),
    );
    findings.push(
      linked.length > 0
        ? {
            id: `assess-link-${assessment.id}`,
            severity: "pass",
            category: "assessment",
            targetType: "assessment",
            targetId: assessment.id,
            targetLabel: truncate(assessment.title || "Untitled assessment"),
            message: `Aligned to ${linked.length} outcome${linked.length === 1 ? "" : "s"}.`,
          }
        : {
            id: `assess-link-${assessment.id}`,
            severity: "fail",
            category: "assessment",
            targetType: "assessment",
            targetId: assessment.id,
            targetLabel: truncate(assessment.title || "Untitled assessment"),
            message: "Assessment is not aligned to any outcome.",
            remediation: "Link this assessment to the outcomes it measures, or remove it.",
          },
    );
  }

  // Aggregate scores.
  const categories: RuleCategory[] = [
    "measurability",
    "standards",
    "assessment",
    "clarity",
    "structure",
  ];
  const categoryScores: CategoryScore[] = categories.map((category) => {
    const inCat = findings.filter((f) => f.category === category);
    const total = inCat.length;
    const weight = inCat.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
    return {
      category,
      passed: inCat.filter((f) => f.severity === "pass").length,
      total,
      score: total ? Math.round((weight / total) * 100) : 100,
    };
  });

  const totalWeight = findings.reduce(
    (sum, f) => sum + SEVERITY_WEIGHT[f.severity],
    0,
  );
  const score = findings.length
    ? Math.round((totalWeight / findings.length) * 100)
    : 0;

  const counts = {
    pass: findings.filter((f) => f.severity === "pass").length,
    warn: findings.filter((f) => f.severity === "warn").length,
    fail: findings.filter((f) => f.severity === "fail").length,
  };

  const bloomDistribution = BLOOM_LEVELS.map((level) => ({
    level,
    count: analyses.filter((a) => a.detection.bloomLevel === level).length,
  })).filter((b) => b.count > 0);

  // Order findings fail -> warn -> pass for display.
  const order: Record<Severity, number> = { fail: 0, warn: 1, pass: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return {
    findings,
    score,
    categoryScores,
    counts,
    bloomDistribution,
    objectiveAnalyses: analyses,
  };
}

let idCounter = 0;
export function nextDemoId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// Sector starter templates. Each one is intentionally imperfect (one vague
// outcome, one unmapped outcome, one outcome with no assessment) so the QA stage
// has real issues to surface; the visitor fixes them and watches the score climb.
// This is the core demo hook, so it works across the sectors we sell into.
export type CourseTemplateId = "healthcare" | "corporate" | "k12";

export interface CourseTemplate {
  id: CourseTemplateId;
  name: string;
  audience: string;
  tagline: string;
  build: () => DemoCourse;
}

/** Healthcare: a prelicensure nursing course mapped to CCNE and ACEN standards. */
function buildHealthcareCourse(): DemoCourse {
  const o1 = nextDemoId("obj");
  const o2 = nextDemoId("obj");
  const o3 = nextDemoId("obj");
  const o4 = nextDemoId("obj");
  return {
    title: "Medical-Surgical Nursing: Adult Acute Care",
    gradeBand: "Prelicensure BSN",
    termWeeks: 15,
    objectives: [
      {
        id: o1,
        text: "Assess a postoperative patient for early signs of hemorrhage and infection.",
        standardId: "ccne-d2",
      },
      {
        id: o2,
        text: "Understand the pathophysiology of heart failure.",
        standardId: "ccne-d1",
      },
      {
        id: o3,
        text: "Demonstrate safe medication administration using the rights of medication administration.",
        standardId: null,
      },
      {
        id: o4,
        text: "Recognize early signs of clinical deterioration and escalate care.",
        standardId: "acen-outcomes",
      },
    ],
    assessments: [
      {
        id: nextDemoId("asm"),
        title: "Medical-surgical comprehensive exam",
        type: "summative",
        objectiveIds: [o1, o2],
      },
      {
        id: nextDemoId("asm"),
        title: "Medication administration skills validation",
        type: "formative",
        objectiveIds: [o3],
      },
    ],
  };
}

/** Corporate: a new-manager leadership program mapped to ATD and SHRM. */
function buildCorporateCourse(): DemoCourse {
  const o1 = nextDemoId("obj");
  const o2 = nextDemoId("obj");
  const o3 = nextDemoId("obj");
  const o4 = nextDemoId("obj");
  return {
    title: "Leadership Essentials for New Managers",
    gradeBand: "Workforce / corporate L&D",
    termWeeks: 6,
    objectives: [
      {
        id: o1,
        text: "Demonstrate active-listening techniques during a one-on-one meeting.",
        standardId: "shrm-comm",
      },
      {
        id: o2,
        text: "Understand the difference between managing and leading.",
        standardId: "shrm-lead",
      },
      {
        id: o3,
        text: "Apply a structured feedback model to deliver constructive feedback.",
        standardId: null,
      },
      {
        id: o4,
        text: "Develop a 30-60-90 day onboarding plan for a new team member.",
        standardId: "atd-id",
      },
    ],
    assessments: [
      {
        id: nextDemoId("asm"),
        title: "Leadership scenario role-play",
        type: "formative",
        objectiveIds: [o1, o2],
      },
      {
        id: nextDemoId("asm"),
        title: "Feedback conversation simulation",
        type: "summative",
        objectiveIds: [o3],
      },
    ],
  };
}

/** K-12: a data-literacy course mapped to Common Core standards. */
function buildK12Course(): DemoCourse {
  const o1 = nextDemoId("obj");
  const o2 = nextDemoId("obj");
  const o3 = nextDemoId("obj");
  const o4 = nextDemoId("obj");
  return {
    title: "Foundations of Data Literacy",
    gradeBand: "Grades 9 to 10",
    termWeeks: 12,
    objectives: [
      {
        id: o1,
        text: "Interpret measures of center and spread to compare two data sets.",
        standardId: "ccss-hss-id-a-2",
      },
      {
        id: o2,
        text: "Understand how data visualizations can mislead an audience.",
        standardId: "ccss-rst-9-10-7",
      },
      {
        id: o3,
        text: "Design a data dashboard that answers a real-world question.",
        standardId: null,
      },
      {
        id: o4,
        text: "Recognize common sources of bias in data collection.",
        standardId: "ccss-ri-9-10-1",
      },
    ],
    assessments: [
      {
        id: nextDemoId("asm"),
        title: "Unit 1 data analysis quiz",
        type: "summative",
        objectiveIds: [o1],
      },
      {
        id: nextDemoId("asm"),
        title: "Misleading-chart critique",
        type: "formative",
        objectiveIds: [o2, o4],
      },
    ],
  };
}

export const COURSE_TEMPLATES: CourseTemplate[] = [
  {
    id: "healthcare",
    name: "Healthcare and nursing",
    audience: "Prelicensure BSN",
    tagline: "Aligned to CCNE Essentials and ACEN standards.",
    build: buildHealthcareCourse,
  },
  {
    id: "corporate",
    name: "Corporate and workforce",
    audience: "Workforce / corporate L&D",
    tagline: "Leadership and onboarding aligned to ATD and SHRM.",
    build: buildCorporateCourse,
  },
  {
    id: "k12",
    name: "K-12 classroom",
    audience: "Grades 9 to 10",
    tagline: "Data literacy aligned to Common Core.",
    build: buildK12Course,
  },
];

export const COURSE_TEMPLATE_MAP: Record<CourseTemplateId, CourseTemplate> =
  Object.fromEntries(COURSE_TEMPLATES.map((t) => [t.id, t])) as Record<
    CourseTemplateId,
    CourseTemplate
  >;

/** Build a fresh course from a named sector template. */
export function buildTemplateCourse(id: CourseTemplateId): DemoCourse {
  return (COURSE_TEMPLATE_MAP[id] ?? COURSE_TEMPLATES[0]).build();
}

/** Default starter course for the demo: the healthcare/nursing template. */
export function buildExampleCourse(): DemoCourse {
  return buildHealthcareCourse();
}

function severitySymbol(severity: Severity): string {
  if (severity === "pass") return "[pass]";
  if (severity === "warn") return "[warn]";
  return "[fail]";
}

/** Render a plain-text / markdown handoff report for export. */
export function renderQaReportMarkdown(course: DemoCourse, report: QaReport): string {
  const lines: string[] = [];
  lines.push(`# ${course.title || "Untitled course"} - Curriculum QA Report`);
  lines.push("");
  lines.push(`Audience or level: ${course.gradeBand || "Not set"}`);
  lines.push(`Term length: ${course.termWeeks ? `${course.termWeeks} weeks` : "Not set"}`);
  lines.push(`Overall QA score: ${report.score}%`);
  lines.push(
    `Checks: ${report.counts.pass} passed, ${report.counts.warn} advisory, ${report.counts.fail} to fix`,
  );
  lines.push("");

  lines.push("## Category scores");
  for (const c of report.categoryScores) {
    lines.push(`- ${RULE_CATEGORY_LABELS[c.category]}: ${c.score}%`);
  }
  lines.push("");

  lines.push("## Learning outcomes");
  course.objectives.forEach((o, i) => {
    const analysis = report.objectiveAnalyses.find((a) => a.objectiveId === o.id);
    const std = o.standardId ? DEMO_STANDARD_MAP[o.standardId] : null;
    lines.push(`${i + 1}. ${o.text || "Untitled outcome"}`);
    lines.push(
      `   Bloom level: ${analysis?.detection.bloomLevel ?? "not detected"}; Standard: ${std ? `${std.framework} ${std.code}` : "unmapped"}; Assessments: ${analysis?.assessmentCount ?? 0}`,
    );
  });
  lines.push("");

  lines.push("## Assessments");
  course.assessments.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.title || "Untitled assessment"} (${a.type})`);
  });
  lines.push("");

  const openItems = report.findings.filter((f) => f.severity !== "pass");
  lines.push("## Items to resolve");
  if (openItems.length === 0) {
    lines.push("None. All checks passed.");
  } else {
    for (const f of openItems) {
      lines.push(`- ${severitySymbol(f.severity)} ${f.targetLabel}: ${f.message}`);
      if (f.remediation) lines.push(`  Fix: ${f.remediation}`);
    }
  }
  lines.push("");
  lines.push("Generated by the Synops Curriculum Builder demo.");
  return lines.join("\n");
}
