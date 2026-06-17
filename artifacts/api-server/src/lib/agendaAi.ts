import { z } from "zod";

/**
 * Agenda extraction: turn a meeting's free-text notes into (1) tracked action
 * items and (2) a proposed agenda for the NEXT meeting.
 *
 * Two providers, same output shape:
 *   - "openai": the built-in AI integration (Replit OpenAI proxy), used only when
 *     AI_INTEGRATIONS_OPENAI_BASE_URL + AI_INTEGRATIONS_OPENAI_API_KEY are set.
 *     The client is imported dynamically so a missing integration never throws at
 *     module load; any AI error falls through to the rules path.
 *   - "rules": a deterministic, dependency-free extractor that scans the notes for
 *     action-like lines and builds a standard four-part agenda. The product works
 *     fully without any AI configured.
 *
 * All generated text is sanitized to honor the project's copy rules: no em dashes
 * and no emojis, in the product UI or in exported content.
 */

const AGENDA_MODEL = "gpt-5.4";
const NOTES_AI_LIMIT = 16000;
const MAX_ACTION_ITEMS = 40;

export type ActionCategory = "general" | "content" | "review" | "accessibility";

export interface ExtractedActionItem {
  title: string;
  description: string | null;
  ownerName: string | null;
  category: ActionCategory;
  weekIndex: number | null;
  dueAt: string | null;
}

export interface ExtractedAgendaItem {
  title: string;
  minutes: number;
  prompts: string[];
}

export interface ExtractedAgenda {
  proposedDate: string | null;
  proposedTime: string | null;
  summary: string[];
  items: ExtractedAgendaItem[];
}

export interface AgendaExtraction {
  provider: "openai" | "rules";
  actionItems: ExtractedActionItem[];
  agenda: ExtractedAgenda;
}

export interface AgendaAiInput {
  notes: string;
  projectTitle: string;
  courseTitle: string | null;
  termWeeks: number | null;
  meetingTitle: string;
  meetingDate: Date | null;
  openActionItems: { title: string; status: string }[];
}

// ── Text hygiene ───────────────────────────────────────────────
// Replace em/en dashes with a plain hyphen and strip emoji so generated copy
// obeys the no-em-dash / no-emoji rule. Collapse runs of spaces.
export function sanitizeText(value: string): string {
  return value
    .replace(/[\u2014\u2013]/g, "-")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function clampWeek(week: number, termWeeks: number | null): number | null {
  if (!Number.isFinite(week) || week < 0) return null;
  const upper = termWeeks && termWeeks > 0 ? termWeeks - 1 : 51;
  return Math.min(week, upper);
}

function categorize(text: string): ActionCategory {
  if (/\b(accessib\w*|wcag|alt[\s-]?text|caption|contrast|screen[\s-]?reader|aria)\b/i.test(text)) {
    return "accessibility";
  }
  if (/\b(review|qa|quality|feedback|approve|approval|revise|revision|proof)\b/i.test(text)) {
    return "review";
  }
  if (/\b(draft|write|author|content|module|lesson|storyboard|script|slide|video|assessment|rubric|outline)\b/i.test(text)) {
    return "content";
  }
  return "general";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (ISO_DATE.test(v)) return v;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  return HHMM.test(v) ? v : null;
}

// The default cadence: the next meeting is proposed one week after this one, at
// the same time of day (or 10:00 when this meeting had no recorded time).
function defaultNextSlot(meetingDate: Date | null): { proposedDate: string | null; proposedTime: string | null } {
  if (!meetingDate || Number.isNaN(meetingDate.getTime())) {
    return { proposedDate: null, proposedTime: null };
  }
  const next = new Date(meetingDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const proposedDate = next.toISOString().slice(0, 10);
  const hh = String(next.getUTCHours()).padStart(2, "0");
  const mm = String(next.getUTCMinutes()).padStart(2, "0");
  const proposedTime = `${hh}:${mm}`;
  return { proposedDate, proposedTime: proposedTime === "00:00" ? "10:00" : proposedTime };
}

// ── Rules-based extraction (always available) ──────────────────

function rulesExtractActionItems(input: AgendaAiInput): ExtractedActionItem[] {
  const lines = input.notes.split(/\r?\n/);
  const items: ExtractedActionItem[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const line = raw.trim();
    if (line.length < 3) continue;

    const isAction =
      /^[-*•]/.test(line) ||
      /\[\s?\]/.test(line) ||
      /\b(todo|to-do|action item|action:|next step|follow[\s-]?up|need to|needs to|will |should |assign|prepare|draft|review|create|update|send|schedule|fix|add)\b/i.test(
        line,
      );
    if (!isAction) continue;

    let text = line
      .replace(/^[-*•]\s*/, "")
      .replace(/^\[\s?\]\s*/, "")
      .replace(/^(action item|action|todo|to-do|next step|follow[\s-]?up)\s*[:-]\s*/i, "")
      .trim();
    if (text.length < 3) continue;

    let ownerName: string | null = null;
    const ownerMatch =
      text.match(/\bowner\s*:\s*([A-Za-z][\w .'-]{1,40})/i) ||
      text.match(/@([A-Za-z][\w.'-]{1,40})/);
    if (ownerMatch) ownerName = ownerMatch[1].trim();

    let weekIndex: number | null = null;
    const weekMatch = text.match(/\bweek\s*(\d{1,2})\b/i);
    if (weekMatch) weekIndex = clampWeek(parseInt(weekMatch[1], 10) - 1, input.termWeeks);

    const title = sanitizeText(text).slice(0, 280);
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      title,
      description: null,
      ownerName: ownerName ? sanitizeText(ownerName).slice(0, 200) : null,
      category: categorize(title),
      weekIndex,
      dueAt: null,
    });
    if (items.length >= MAX_ACTION_ITEMS) break;
  }

  return items;
}

function buildAgenda(
  input: AgendaAiInput,
  newItems: ExtractedActionItem[],
  slot: { proposedDate: string | null; proposedTime: string | null },
): ExtractedAgenda {
  const openTitles = input.openActionItems
    .filter((a) => a.status !== "done")
    .map((a) => sanitizeText(a.title));

  const summary: string[] = [`Recap of ${sanitizeText(input.meetingTitle)}.`];
  if (newItems.length > 0) {
    summary.push(`${newItems.length} new action item${newItems.length === 1 ? "" : "s"} captured from the notes.`);
  }
  if (openTitles.length > 0) {
    summary.push(`${openTitles.length} open action item${openTitles.length === 1 ? "" : "s"} still in progress.`);
  }

  const progressPrompts: string[] = ["Confirm what was completed since the last meeting."];
  for (const t of openTitles.slice(0, 5)) progressPrompts.push(`Status check: ${t}`);

  const workPrompts: string[] =
    newItems.length > 0
      ? newItems.slice(0, 6).map((i) => `Plan: ${i.title}`)
      : ["Identify the next set of action items and assign owners."];

  const accessibilityItems = [...newItems.filter((i) => i.category === "accessibility")];
  const accessibilityPrompts: string[] =
    accessibilityItems.length > 0
      ? accessibilityItems.slice(0, 5).map((i) => `Verify: ${i.title}`)
      : ["Confirm WCAG 2.1 AA requirements are tracked for new content."];

  const items: ExtractedAgendaItem[] = [
    { title: "Review progress since last meeting", minutes: 10, prompts: progressPrompts },
    { title: "Work through action items", minutes: 15, prompts: workPrompts },
    { title: "Accessibility check (WCAG 2.1 AA)", minutes: 10, prompts: accessibilityPrompts },
    {
      title: "Confirm next steps and owners",
      minutes: 10,
      prompts: ["Assign an owner to each open action.", "Agree the date and goal for the next meeting."],
    },
  ];

  return { proposedDate: slot.proposedDate, proposedTime: slot.proposedTime, summary, items };
}

function rulesExtract(input: AgendaAiInput): AgendaExtraction {
  const actionItems = rulesExtractActionItems(input);
  const slot = defaultNextSlot(input.meetingDate);
  return { provider: "rules", actionItems, agenda: buildAgenda(input, actionItems, slot) };
}

// ── AI extraction (optional, behind env fallback) ──────────────

const AiActionItem = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  ownerName: z.string().nullable().optional(),
  category: z.enum(["general", "content", "review", "accessibility"]).optional(),
  weekIndex: z.number().nullable().optional(),
  dueAt: z.string().nullable().optional(),
});

const AiAgendaItem = z.object({
  title: z.string().min(1),
  minutes: z.number().optional(),
  prompts: z.array(z.string()).optional(),
});

const AiResult = z.object({
  actionItems: z.array(AiActionItem).optional(),
  agenda: z
    .object({
      proposedDate: z.string().nullable().optional(),
      proposedTime: z.string().nullable().optional(),
      summary: z.array(z.string()).optional(),
      items: z.array(AiAgendaItem).optional(),
    })
    .optional(),
});

async function getOpenAI() {
  if (!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || !process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    return null;
  }
  try {
    const mod = await import("@workspace/integrations-openai-ai-server");
    return mod.openai;
  } catch {
    return null;
  }
}

function normalizeAi(data: z.infer<typeof AiResult>, input: AgendaAiInput): AgendaExtraction {
  const actionItems: ExtractedActionItem[] = [];
  const seen = new Set<string>();
  for (const raw of data.actionItems ?? []) {
    const title = sanitizeText(raw.title).slice(0, 280);
    if (title.length < 3) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    actionItems.push({
      title,
      description: raw.description ? sanitizeText(raw.description).slice(0, 2000) : null,
      ownerName: raw.ownerName ? sanitizeText(raw.ownerName).slice(0, 200) : null,
      category: raw.category ?? categorize(title),
      weekIndex: raw.weekIndex == null ? null : clampWeek(Math.trunc(raw.weekIndex), input.termWeeks),
      dueAt: normalizeAiDueAt(raw.dueAt),
    });
    if (actionItems.length >= MAX_ACTION_ITEMS) break;
  }

  const slotFallback = defaultNextSlot(input.meetingDate);
  const proposedDate = normalizeDate(data.agenda?.proposedDate) ?? slotFallback.proposedDate;
  const proposedTime = normalizeTime(data.agenda?.proposedTime) ?? slotFallback.proposedTime;

  const aiItems = (data.agenda?.items ?? [])
    .map((i) => ({
      title: sanitizeText(i.title).slice(0, 200),
      minutes: i.minutes && i.minutes > 0 ? Math.min(Math.trunc(i.minutes), 240) : 10,
      prompts: (i.prompts ?? []).map((p) => sanitizeText(p)).filter((p) => p.length > 0).slice(0, 8),
    }))
    .filter((i) => i.title.length > 0)
    .slice(0, 8);

  if (aiItems.length === 0) {
    // The model returned action items but no usable agenda; build one from the
    // extracted items so the response is always actionable.
    return {
      provider: "openai",
      actionItems,
      agenda: buildAgenda(input, actionItems, { proposedDate, proposedTime }),
    };
  }

  const summary = (data.agenda?.summary ?? [])
    .map((s) => sanitizeText(s))
    .filter((s) => s.length > 0)
    .slice(0, 8);

  return {
    provider: "openai",
    actionItems,
    agenda: {
      proposedDate,
      proposedTime,
      summary: summary.length > 0 ? summary : [`Recap of ${sanitizeText(input.meetingTitle)}.`],
      items: aiItems,
    },
  };
}

function normalizeAiDueAt(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function aiExtract(input: AgendaAiInput): Promise<AgendaExtraction | null> {
  const client = await getOpenAI();
  if (!client) return null;

  const weeksUpper = input.termWeeks && input.termWeeks > 0 ? input.termWeeks : 52;
  const clamped = input.notes.slice(0, NOTES_AI_LIMIT);
  const openList =
    input.openActionItems.length > 0
      ? input.openActionItems
          .slice(0, 30)
          .map((a) => `- [${a.status}] ${a.title}`)
          .join("\n")
      : "(none)";

  const system =
    "You convert consulting meeting notes for an instructional-design project into structured JSON. " +
    "Respond with a single JSON object and nothing else. Do not use em dashes. Do not use emojis. " +
    'Schema: {"actionItems":[{"title":string,"description":string|null,"ownerName":string|null,' +
    '"category":"general"|"content"|"review"|"accessibility","weekIndex":integer|null,"dueAt":string|null}],' +
    '"agenda":{"proposedDate":"YYYY-MM-DD"|null,"proposedTime":"HH:MM"|null,"summary":string[],' +
    '"items":[{"title":string,"minutes":integer,"prompts":string[]}]}}. ' +
    `weekIndex is zero-based and only set when the notes name a specific week (0 to ${weeksUpper - 1}). ` +
    "Use category accessibility for WCAG or accessibility tasks. Keep titles concise and action oriented. " +
    "The agenda is for the NEXT meeting and should fold in any still-open action items.";

  const user =
    `Project: ${input.projectTitle}\n` +
    `Course: ${input.courseTitle ?? "none"}\n` +
    `Term weeks: ${input.termWeeks ?? "unknown"}\n` +
    `This meeting: ${input.meetingTitle}${input.meetingDate ? ` on ${input.meetingDate.toISOString()}` : ""}\n` +
    `Currently open action items:\n${openList}\n\n` +
    `Meeting notes:\n${clamped}`;

  try {
    const resp = await client.chat.completions.create({
      model: AGENDA_MODEL,
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content = resp.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = AiResult.safeParse(JSON.parse(content));
    if (!parsed.success) return null;
    return normalizeAi(parsed.data, input);
  } catch {
    return null;
  }
}

/**
 * Public entry point. Tries the built-in AI first (when configured) and always
 * falls back to the deterministic rules extractor, so a caller never has to know
 * whether AI is available. Empty notes short-circuit to a rules agenda with no
 * new action items.
 */
export async function extractAgendaFromNotes(input: AgendaAiInput): Promise<AgendaExtraction> {
  if (input.notes.trim().length === 0) {
    return rulesExtract({ ...input, notes: "" });
  }
  const ai = await aiExtract(input);
  if (ai) return ai;
  return rulesExtract(input);
}
