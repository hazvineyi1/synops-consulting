// Interactive Socratic kickoff engine for the Compass curriculum engine.
//
// This is a deterministic, rules-based question flow. There is NO AI dependency.
// It poses expert framing questions, branches on each answer AND on the project's
// chosen design method, and produces a readable summary of the decisions made.
//
// The flow definition (nodes) lives here in code. Only the answers, the current
// position, and the generated summary are persisted (KickoffState), so the graph
// can evolve without invalidating stored progress.

import { INSTRUCTIONAL_METHODS, getMethod, type MethodKey } from "./instructional-methods";

export const KICKOFF_VERSION = 1;
export const KICKOFF_START_NODE = "framing";

export interface KickoffOption {
  value: string;
  label: string;
}

export interface KickoffContext {
  designMethod: MethodKey | null;
  // nodeId -> chosen option value, for branches that depend on earlier answers.
  answers: Record<string, string>;
}

export interface KickoffNode {
  id: string;
  prompt: string;
  helpText?: string;
  options: KickoffOption[];
  // Returns the next node id, or null to end the flow.
  next: (value: string, ctx: KickoffContext) => string | null;
}

// One tailored node per design method. The id is always `m_<methodKey>`.
const METHOD_NODES: Record<MethodKey, KickoffNode> = {
  addie: {
    id: "m_addie",
    prompt: "ADDIE works best when requirements are stable. Which phase needs the most attention on this build?",
    helpText: "Pick the phase where the project carries the most risk today.",
    options: [
      { value: "analyze", label: "Analyze: the gap and audience are not fully understood" },
      { value: "design", label: "Design: objectives and sequence need to be set" },
      { value: "develop", label: "Develop: materials and media must be produced" },
      { value: "evaluate", label: "Evaluate: we need a plan to measure results" },
    ],
    next: () => "wrap",
  },
  sam: {
    id: "m_sam",
    prompt: "SAM is prototype-first. What should your first Savvy Start prototype test?",
    helpText: "Choose the riskiest assumption to validate early and cheaply.",
    options: [
      { value: "navigation", label: "The overall navigation and flow" },
      { value: "core_interaction", label: "The core learning interaction" },
      { value: "content_fit", label: "Whether the content matches learner needs" },
      { value: "assessment", label: "The assessment approach" },
    ],
    next: () => "wrap",
  },
  "backward-design": {
    id: "m_backward-design",
    prompt: "Backward design starts from the results. How far along is your evidence plan?",
    helpText: "Acceptable evidence should be defined before the learning activities.",
    options: [
      { value: "evidence_first", label: "Outcomes and acceptable evidence are both defined" },
      { value: "outcomes_only", label: "Outcomes are defined, evidence is not" },
      { value: "activities_first", label: "Activities exist but outcomes are loose" },
      { value: "not_yet", label: "Nothing is defined yet" },
    ],
    next: () => "wrap",
  },
  blooms: {
    id: "m_blooms",
    prompt: "Bloom's taxonomy balances cognitive demand. Where do the current objectives mostly sit?",
    helpText: "Most courses benefit from a deliberate mix rather than clustering at one tier.",
    options: [
      { value: "lower", label: "Remember and understand" },
      { value: "middle", label: "Apply and analyze" },
      { value: "higher", label: "Evaluate and create" },
      { value: "uneven", label: "Uneven or not yet written" },
    ],
    next: () => "wrap",
  },
  gagne: {
    id: "m_gagne",
    prompt: "Gagne's nine events structure a single lesson. Which event is weakest in your current draft?",
    options: [
      { value: "attention", label: "Gaining attention" },
      { value: "recall", label: "Recalling prior learning" },
      { value: "performance", label: "Eliciting performance" },
      { value: "feedback", label: "Providing feedback" },
    ],
    next: () => "wrap",
  },
  merrill: {
    id: "m_merrill",
    prompt: "Merrill's first principles are problem-centered. Is there a real-world problem anchoring the learning?",
    options: [
      { value: "clear", label: "Yes, a clear authentic problem" },
      { value: "loose", label: "A loose scenario, not yet authentic" },
      { value: "topic", label: "It is organized by topic, not a problem" },
      { value: "none", label: "No anchoring problem yet" },
    ],
    next: () => "wrap",
  },
  "four-c-id": {
    id: "m_four-c-id",
    prompt: "4C/ID centers authentic whole tasks. How are the learning tasks sequenced?",
    options: [
      { value: "simple_to_complex", label: "Whole tasks from simple to complex" },
      { value: "by_topic", label: "By topic rather than by task" },
      { value: "single_capstone", label: "One large capstone only" },
      { value: "not_sequenced", label: "Not sequenced yet" },
    ],
    next: () => "wrap",
  },
  kirkpatrick: {
    id: "m_kirkpatrick",
    prompt: "Kirkpatrick's levels measure impact. What is the highest level you can realistically measure?",
    options: [
      { value: "reaction", label: "Reaction: learner response" },
      { value: "learning", label: "Learning: knowledge or skill gained" },
      { value: "behavior", label: "Behavior: changed performance on the job" },
      { value: "results", label: "Results: organizational outcomes" },
    ],
    next: () => "wrap",
  },
};

const SHARED_NODES: Record<string, KickoffNode> = {
  framing: {
    id: "framing",
    prompt: "What is the core problem this curriculum must solve?",
    helpText: "Naming the gap keeps every later decision anchored to a real need.",
    options: [
      { value: "knowledge_gap", label: "Learners lack foundational knowledge" },
      { value: "skill_gap", label: "Learners cannot yet perform a skill" },
      { value: "transfer_gap", label: "Learners know it but cannot transfer it to real work" },
      { value: "engagement_gap", label: "Learners disengage or do not complete" },
    ],
    // Answer-driven branch: skill and transfer gaps warrant a performance question.
    next: (value) =>
      value === "skill_gap" || value === "transfer_gap" ? "performance_context" : "audience",
  },
  performance_context: {
    id: "performance_context",
    prompt: "What real-world performance must learners be able to do?",
    helpText: "Describing the target performance shapes the tasks and the evidence.",
    options: [
      { value: "procedure", label: "Follow a defined procedure correctly" },
      { value: "judgment", label: "Exercise judgment across varied situations" },
      { value: "creation", label: "Create an original product or solution" },
      { value: "communication", label: "Communicate or collaborate effectively" },
    ],
    next: () => "audience",
  },
  audience: {
    id: "audience",
    prompt: "Who are the learners, and what do they already bring?",
    options: [
      { value: "novice", label: "Mostly novices with little prior exposure" },
      { value: "mixed", label: "Mixed levels of experience" },
      { value: "practitioners", label: "Working practitioners with real experience" },
    ],
    next: () => "evidence",
  },
  evidence: {
    id: "evidence",
    prompt: "How will you know the curriculum worked?",
    helpText: "The evidence you accept determines how you assess.",
    options: [
      { value: "assessment_scores", label: "Improved assessment performance" },
      { value: "authentic_performance", label: "Success on an authentic task or project" },
      { value: "on_the_job", label: "Changed behavior on the job" },
      { value: "completion_satisfaction", label: "Completion and learner satisfaction" },
    ],
    next: () => "constraint",
  },
  constraint: {
    id: "constraint",
    prompt: "What is the tightest constraint right now?",
    options: [
      { value: "time", label: "Limited development time" },
      { value: "sme", label: "Limited subject-matter expert availability" },
      { value: "unclear_reqs", label: "Requirements are still unclear" },
      { value: "tech", label: "Technology or LMS limitations" },
    ],
    // Route into the method-specific question, or the neutral path if no method is set.
    next: (_value, ctx) => (ctx.designMethod ? `m_${ctx.designMethod}` : "method_neutral"),
  },
  method_neutral: {
    id: "method_neutral",
    prompt: "No design method is selected yet. Which approach best fits this work?",
    helpText: "Your answer becomes a recommendation you can confirm on the Prepare tab.",
    options: [
      { value: "stable_process", label: "A stable, end-to-end process" },
      { value: "prototype_first", label: "Fast prototyping with frequent review" },
      { value: "outcome_alignment", label: "Strict alignment to outcomes and evidence" },
      { value: "single_lesson", label: "A dependable structure for a single lesson" },
    ],
    next: () => "wrap",
  },
  wrap: {
    id: "wrap",
    prompt: "What is the immediate next step after this kickoff?",
    options: [
      { value: "draft_objectives", label: "Draft or refine learning objectives" },
      { value: "build_prototype", label: "Build a first prototype or module" },
      { value: "define_assessment", label: "Define the assessment and evidence plan" },
      { value: "align_stakeholders", label: "Align stakeholders on scope" },
    ],
    next: () => null,
  },
};

export function getKickoffNode(id: string): KickoffNode | undefined {
  if (id in SHARED_NODES) return SHARED_NODES[id];
  const methodNode = Object.values(METHOD_NODES).find((n) => n.id === id);
  return methodNode;
}

export function getOptionLabel(node: KickoffNode, value: string): string {
  return node.options.find((o) => o.value === value)?.label ?? value;
}

// A friendly recommendation for the method-neutral branch.
const NEUTRAL_RECOMMENDATION: Record<string, MethodKey> = {
  stable_process: "addie",
  prototype_first: "sam",
  outcome_alignment: "backward-design",
  single_lesson: "gagne",
};

// Readable summary line for the method-specific question (node id `m_<method>`),
// so the Socratic branch reflects the actual ADDIE/SAM/etc. decision, not just
// the generic "method in use" note. Keyed by method, then by option value.
const METHOD_FOCUS: Record<MethodKey, Record<string, string>> = {
  addie: {
    analyze: "Focus the ADDIE work on Analysis: clarify the gap and audience first.",
    design: "Focus the ADDIE work on Design: set objectives and the sequence next.",
    develop: "Focus the ADDIE work on Development: plan production of materials and media.",
    evaluate: "Focus the ADDIE work on Evaluation: define how results will be measured.",
  },
  sam: {
    navigation: "First SAM prototype should test the overall navigation and flow.",
    core_interaction: "First SAM prototype should test the core learning interaction.",
    content_fit: "First SAM prototype should test whether the content matches learner needs.",
    assessment: "First SAM prototype should test the assessment approach.",
  },
  "backward-design": {
    evidence_first: "Evidence plan is solid: outcomes and acceptable evidence are both defined.",
    outcomes_only: "Define acceptable evidence next; outcomes exist but evidence does not.",
    activities_first: "Tighten outcomes first; activities exist but outcomes are loose.",
    not_yet: "Start from outcomes and acceptable evidence before any activities.",
  },
  blooms: {
    lower: "Objectives cluster at remember and understand; add higher-order targets.",
    middle: "Objectives sit at apply and analyze; confirm the intended cognitive demand.",
    higher: "Objectives reach evaluate and create; ensure scaffolding supports them.",
    uneven: "Rewrite objectives for a deliberate spread across Bloom's tiers.",
  },
  gagne: {
    attention: "Strengthen gaining attention at the start of the lesson.",
    recall: "Strengthen recall of prior learning before introducing new content.",
    performance: "Strengthen eliciting performance with active practice.",
    feedback: "Strengthen the feedback learners receive during practice.",
  },
  merrill: {
    clear: "A clear authentic problem anchors the learning; build tasks around it.",
    loose: "Sharpen the scenario into an authentic problem to anchor the work.",
    topic: "Reorganize from topics to a problem-centered structure.",
    none: "Define an authentic anchoring problem before building tasks.",
  },
  "four-c-id": {
    simple_to_complex: "Whole tasks run simple to complex; keep that progression.",
    by_topic: "Resequence from topics to whole tasks of increasing complexity.",
    single_capstone: "Break the single capstone into a ladder of whole tasks.",
    not_sequenced: "Sequence the learning tasks from simple to complex whole tasks.",
  },
  kirkpatrick: {
    reaction: "Measurement reaches Reaction; plan at least a Learning-level check.",
    learning: "Measurement reaches Learning; consider a Behavior follow-up.",
    behavior: "Measurement reaches Behavior; connect it to Results where possible.",
    results: "Measurement reaches Results; tie outcomes back to the business goal.",
  },
};

// Builds a readable, deterministic summary from the recorded answers. No em
// dashes or emojis, to match the product copy rules.
export function buildKickoffSummary(
  answers: Record<string, string>,
  designMethod: MethodKey | null,
): string[] {
  const lines: string[] = [];

  const problemMap: Record<string, string> = {
    knowledge_gap: "close a foundational knowledge gap",
    skill_gap: "build a skill learners cannot yet perform",
    transfer_gap: "help learners transfer knowledge to real work",
    engagement_gap: "improve engagement and completion",
  };
  if (answers.framing) {
    lines.push(`The curriculum should ${problemMap[answers.framing] ?? "address the stated gap"}.`);
  }

  const performanceMap: Record<string, string> = {
    procedure: "follow a defined procedure correctly",
    judgment: "exercise judgment across varied situations",
    creation: "create an original product or solution",
    communication: "communicate or collaborate effectively",
  };
  if (answers.performance_context) {
    lines.push(
      `Target performance: learners must ${performanceMap[answers.performance_context] ?? "perform the target task"}.`,
    );
  }

  const audienceMap: Record<string, string> = {
    novice: "Design for novices: scaffold heavily and check understanding often.",
    mixed: "Design for mixed levels: offer optional depth and clear entry points.",
    practitioners: "Design for practitioners: lead with authentic, job-relevant tasks.",
  };
  if (answers.audience && audienceMap[answers.audience]) {
    lines.push(audienceMap[answers.audience]);
  }

  const evidenceMap: Record<string, string> = {
    assessment_scores: "Plan assessments that produce comparable performance data.",
    authentic_performance: "Center evidence on an authentic task scored with a rubric.",
    on_the_job: "Plan a follow-up to capture changed behavior on the job.",
    completion_satisfaction: "Track completion and satisfaction, and pair them with a learning check.",
  };
  if (answers.evidence && evidenceMap[answers.evidence]) {
    lines.push(evidenceMap[answers.evidence]);
  }

  const constraintMap: Record<string, string> = {
    time: "With limited time, reduce scope to the highest-value objectives first.",
    sme: "With limited expert time, batch expert reviews around prototypes.",
    unclear_reqs: "With unclear requirements, prototype early to make decisions concrete.",
    tech: "With platform limits, confirm the LMS and accessibility constraints up front.",
  };
  if (answers.constraint && constraintMap[answers.constraint]) {
    lines.push(constraintMap[answers.constraint]);
  }

  // Method-aware closing guidance.
  if (designMethod) {
    const method = getMethod(designMethod);
    if (method) {
      lines.push(`Method in use: ${method.name}. ${method.bestFor}`);
    }
    const focusValue = answers[`m_${designMethod}`];
    const focusLine = focusValue ? METHOD_FOCUS[designMethod]?.[focusValue] : undefined;
    if (focusLine) {
      lines.push(focusLine);
    }
  } else if (answers.method_neutral) {
    const recommendedKey = NEUTRAL_RECOMMENDATION[answers.method_neutral];
    const recommended = recommendedKey
      ? INSTRUCTIONAL_METHODS.find((m) => m.key === recommendedKey)
      : undefined;
    if (recommended) {
      lines.push(
        `Recommended method: ${recommended.name}. Confirm it on the Prepare tab to tailor templates.`,
      );
    }
  }

  const nextStepMap: Record<string, string> = {
    draft_objectives: "Next step: draft or refine the learning objectives.",
    build_prototype: "Next step: build a first prototype or module.",
    define_assessment: "Next step: define the assessment and evidence plan.",
    align_stakeholders: "Next step: align stakeholders on scope.",
  };
  if (answers.wrap && nextStepMap[answers.wrap]) {
    lines.push(nextStepMap[answers.wrap]);
  }

  return lines;
}

// Total nodes a run will visit depends on branches; this gives a stable count
// for the linear "spine" so the UI can show approximate progress.
export const KICKOFF_SPINE_LENGTH = 6;
