import { Router } from "express";
import { db, remindersTable, applicationsTable } from "@workspace/db";
import { eq, asc, and, desc } from "drizzle-orm";

const router = Router();

router.get("/reminders", async (req, res) => {
  const applicationId = req.query.applicationId ? Number(req.query.applicationId) : undefined;
  const includeDone = req.query.includeDone === "true";

  const conditions = [];
  if (applicationId) conditions.push(eq(remindersTable.applicationId, applicationId));
  if (!includeDone) conditions.push(eq(remindersTable.done, false));

  const rows = await db
    .select({
      id: remindersTable.id,
      applicationId: remindersTable.applicationId,
      dueAt: remindersTable.dueAt,
      note: remindersTable.note,
      done: remindersTable.done,
      createdAt: remindersTable.createdAt,
      company: applicationsTable.company,
      role: applicationsTable.role,
    })
    .from(remindersTable)
    .leftJoin(applicationsTable, eq(remindersTable.applicationId, applicationsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(remindersTable.dueAt));

  res.json(rows.map((r) => ({ ...r, dueAt: r.dueAt.toISOString(), createdAt: r.createdAt.toISOString() })));
});

router.post("/reminders", async (req, res) => {
  const { applicationId, dueAt, note } = req.body as { applicationId: number; dueAt: string; note?: string };

  if (!applicationId || !dueAt) {
    res.status(400).json({ error: "applicationId and dueAt are required" });
    return;
  }

  const [row] = await db
    .insert(remindersTable)
    .values({ applicationId: Number(applicationId), dueAt: new Date(dueAt), note: note ?? null })
    .returning();

  res.status(201).json({ ...row, dueAt: row.dueAt.toISOString(), createdAt: row.createdAt.toISOString() });
});

router.patch("/reminders/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { done, dueAt, note } = req.body as { done?: boolean; dueAt?: string; note?: string };

  const updates: Record<string, unknown> = {};
  if (typeof done === "boolean") updates.done = done;
  if (dueAt) updates.dueAt = new Date(dueAt);
  if (note !== undefined) updates.note = note;

  const [row] = await db
    .update(remindersTable)
    .set(updates)
    .where(eq(remindersTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ ...row, dueAt: row.dueAt.toISOString(), createdAt: row.createdAt.toISOString() });
});

router.delete("/reminders/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(remindersTable).where(eq(remindersTable.id, id));
  res.status(204).send();
});

export default router;
