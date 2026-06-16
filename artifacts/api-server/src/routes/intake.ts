import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, intakeProgressTable } from "@workspace/db";
import {
  GetIntakeProgressParams,
  UpdateIntakeProgressParams,
  UpdateIntakeProgressBody,
} from "@workspace/api-zod";
import { denyNoScope, resolveProjectScope } from "../lib/tenancy";

const router = Router();

const EMPTY = {
  agendaChecks: [] as boolean[][],
  segStatuses: [] as string[],
  confirmedPre: [] as number[],
  notes: {} as Record<string, string>,
  inventorySelections: {} as Record<string, string>,
  autoRules: {} as Record<string, boolean>,
};

function parse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function serialize(row: typeof intakeProgressTable.$inferSelect) {
  return {
    projectId: row.projectId,
    agendaChecks: parse<boolean[][]>(row.agendaChecks, EMPTY.agendaChecks),
    segStatuses: parse<string[]>(row.segStatuses, EMPTY.segStatuses),
    confirmedPre: parse<number[]>(row.confirmedPre, EMPTY.confirmedPre),
    notes: parse<Record<string, string>>(row.notes, EMPTY.notes),
    inventorySelections: parse<Record<string, string>>(
      row.inventorySelections,
      EMPTY.inventorySelections,
    ),
    autoRules: parse<Record<string, boolean>>(row.autoRules, EMPTY.autoRules),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/projects/:projectId/intake-progress", async (req, res): Promise<void> => {
  const params = GetIntakeProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "read",
      "Project not found",
    )
  ) {
    return;
  }

  const [row] = await db
    .select()
    .from(intakeProgressTable)
    .where(eq(intakeProgressTable.projectId, params.data.projectId));

  if (!row) {
    res.json({
      projectId: params.data.projectId,
      ...EMPTY,
      updatedAt: null,
    });
    return;
  }

  res.json(serialize(row));
});

router.put("/projects/:projectId/intake-progress", async (req, res): Promise<void> => {
  const params = UpdateIntakeProgressParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateIntakeProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (
    await denyNoScope(
      res,
      req.actor!,
      await resolveProjectScope(params.data.projectId),
      "write",
      "Project not found",
    )
  ) {
    return;
  }

  const values = {
    projectId: params.data.projectId,
    agendaChecks: JSON.stringify(parsed.data.agendaChecks ?? EMPTY.agendaChecks),
    segStatuses: JSON.stringify(parsed.data.segStatuses ?? EMPTY.segStatuses),
    confirmedPre: JSON.stringify(parsed.data.confirmedPre ?? EMPTY.confirmedPre),
    notes: JSON.stringify(parsed.data.notes ?? EMPTY.notes),
    inventorySelections: JSON.stringify(
      parsed.data.inventorySelections ?? EMPTY.inventorySelections,
    ),
    autoRules: JSON.stringify(parsed.data.autoRules ?? EMPTY.autoRules),
  };

  const [row] = await db
    .insert(intakeProgressTable)
    .values(values)
    .onConflictDoUpdate({
      target: intakeProgressTable.projectId,
      set: {
        agendaChecks: values.agendaChecks,
        segStatuses: values.segStatuses,
        confirmedPre: values.confirmedPre,
        notes: values.notes,
        inventorySelections: values.inventorySelections,
        autoRules: values.autoRules,
      },
    })
    .returning();

  res.json(serialize(row));
});

export default router;
