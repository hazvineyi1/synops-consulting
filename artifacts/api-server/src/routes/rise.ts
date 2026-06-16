import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, learningSessionsTable, usersTable, type LearningSessionRow } from "@workspace/db";
import { requireProduct } from "../lib/auth";
import {
  RISE_LEVELS,
  RISE_LEVEL_LABELS,
  riseBankForLevel,
  findRiseItem,
} from "../lib/riseBank";
import type { DemoLevel } from "../lib/demoBank";

const router = Router();

// Authenticated by the parent router; this additionally scopes access to the
// Rise product (admins bypass).
const gate = requireProduct("rise");

const levelSchema = z.enum(["elementary", "secondary", "higher"]);

const answerSchema = z.object({
  itemId: z.string().min(1).max(40),
  optionIndex: z.number().int().min(0).max(10),
});

const sessionSchema = z.object({
  level: levelSchema,
  itemsAttempted: z.number().int().min(0).max(100),
  correctCount: z.number().int().min(0).max(100),
  masteryEstimate: z.number().int().min(0).max(100),
  finalRung: z.string().max(60).optional(),
  path: z
    .array(
      z.object({
        itemId: z.string().max(40),
        difficulty: z.number().int().min(1).max(5),
        correct: z.boolean(),
      }),
    )
    .max(100),
});

async function isAdmin(userId: number): Promise<boolean> {
  const [u] = await db
    .select({ role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u?.role === "admin";
}

function serializeSession(s: LearningSessionRow) {
  return {
    id: s.id,
    userId: s.userId,
    level: s.level,
    itemsAttempted: s.itemsAttempted,
    correctCount: s.correctCount,
    masteryEstimate: s.masteryEstimate,
    finalRung: s.finalRung,
    path: s.path,
    createdAt: s.createdAt.toISOString(),
  };
}

// List the available reading levels.
router.get("/rise/levels", gate, (_req, res): void => {
  res.json(RISE_LEVELS.map((level) => ({ value: level, label: RISE_LEVEL_LABELS[level] })));
});

// Return the item bank for a level WITHOUT the answer keys.
router.get("/rise/bank", gate, (req, res): void => {
  const parsed = levelSchema.safeParse(req.query.level);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid or missing level" });
    return;
  }
  const items = riseBankForLevel(parsed.data as DemoLevel).map((item) => ({
    id: item.id,
    difficulty: item.difficulty,
    skill: item.skill,
    passage: item.passage,
    question: item.question,
    options: item.options,
  }));
  res.json({ level: parsed.data, items });
});

// Grade a single answer server-side (answer keys never leave the server).
router.post("/rise/answer", gate, (req, res): void => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const item = findRiseItem(parsed.data.itemId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  const correct = parsed.data.optionIndex === item.correctIndex;
  res.json({
    correct,
    correctIndex: item.correctIndex,
    hint: correct ? null : item.hint,
  });
});

// Persist a completed run for the signed-in learner.
router.post("/rise/sessions", gate, async (req, res): Promise<void> => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const userId = req.session.userId!;
  const [row] = await db
    .insert(learningSessionsTable)
    .values({
      userId,
      productKey: "rise",
      level: parsed.data.level,
      itemsAttempted: parsed.data.itemsAttempted,
      correctCount: parsed.data.correctCount,
      masteryEstimate: parsed.data.masteryEstimate,
      finalRung: parsed.data.finalRung ?? null,
      path: parsed.data.path,
    })
    .returning();
  res.status(201).json(serializeSession(row));
});

// List the learner's past runs (admins see all).
router.get("/rise/sessions", gate, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const admin = await isAdmin(userId);
  const rows = admin
    ? await db
        .select()
        .from(learningSessionsTable)
        .orderBy(desc(learningSessionsTable.createdAt))
    : await db
        .select()
        .from(learningSessionsTable)
        .where(eq(learningSessionsTable.userId, userId))
        .orderBy(desc(learningSessionsTable.createdAt));
  res.json(rows.map(serializeSession));
});

export default router;
