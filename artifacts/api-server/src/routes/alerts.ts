import { Router } from "express";
import { db, jobAlertsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateAlertBody,
  DeleteAlertParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/alerts", async (_req, res) => {
  const alerts = await db
    .select()
    .from(jobAlertsTable)
    .orderBy(desc(jobAlertsTable.createdAt));

  res.json(
    alerts.map((a) => ({
      id: a.id,
      keyword: a.keyword,
      company: a.company,
      location: a.location,
      active: a.active,
      createdAt: a.createdAt.toISOString(),
    }))
  );
});

router.post("/alerts", async (req, res) => {
  const body = CreateAlertBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [alert] = await db
    .insert(jobAlertsTable)
    .values({
      keyword: body.data.keyword,
      company: body.data.company ?? null,
      location: body.data.location ?? null,
    })
    .returning();

  res.status(201).json({
    id: alert.id,
    keyword: alert.keyword,
    company: alert.company,
    location: alert.location,
    active: alert.active,
    createdAt: alert.createdAt.toISOString(),
  });
});

router.delete("/alerts/:id", async (req, res) => {
  const params = DeleteAlertParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(jobAlertsTable).where(eq(jobAlertsTable.id, params.data.id));
  res.status(204).send();
});

export default router;
