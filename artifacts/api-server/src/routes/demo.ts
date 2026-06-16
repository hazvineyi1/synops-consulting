import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod/v4";
import { db, demoSessionsTable } from "@workspace/db";
import {
  DEMO_LEVELS,
  DEMO_LEVEL_LABELS,
  bankForLevel,
  findItem,
  type DemoLevel,
} from "../lib/demoBank";

const router = Router();

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many submissions. Please try again later." },
});

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

// List available reading levels.
router.get("/demo/levels", (_req, res): void => {
  res.json(
    DEMO_LEVELS.map((level) => ({ value: level, label: DEMO_LEVEL_LABELS[level] })),
  );
});

// Return the item bank for a level WITHOUT the answer keys.
router.get("/demo/bank", (req, res): void => {
  const parsed = levelSchema.safeParse(req.query.level);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid or missing level" });
    return;
  }
  const items = bankForLevel(parsed.data as DemoLevel).map((item) => ({
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
router.post("/demo/answer", (req, res): void => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const item = findItem(parsed.data.itemId);
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

// Persist an anonymous completed run.
router.post("/demo/sessions", sessionLimiter, async (req, res): Promise<void> => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db
    .insert(demoSessionsTable)
    .values({
      level: parsed.data.level,
      itemsAttempted: parsed.data.itemsAttempted,
      correctCount: parsed.data.correctCount,
      masteryEstimate: parsed.data.masteryEstimate,
      finalRung: parsed.data.finalRung ?? null,
      path: parsed.data.path,
    })
    .returning();
  res.status(201).json({ ok: true, id: row.id });
});

export default router;
