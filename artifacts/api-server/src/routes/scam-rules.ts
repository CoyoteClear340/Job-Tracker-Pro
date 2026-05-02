import { Router } from "express";
import { db, scamRulesTable, applicationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  CreateScamRuleBody,
  UpdateScamRuleBody,
  DeleteScamRuleParams,
  UpdateScamRuleParams,
  MarkApplicationSafeParams,
  MarkApplicationScamParams,
  MarkApplicationScamBody,
} from "@workspace/api-zod";

const router = Router();

function formatRule(r: typeof scamRulesTable.$inferSelect) {
  return {
    id: r.id,
    pattern: r.pattern,
    description: r.description,
    ruleType: r.ruleType,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/scam-rules", async (_req, res) => {
  const rules = await db
    .select()
    .from(scamRulesTable)
    .orderBy(scamRulesTable.ruleType, desc(scamRulesTable.createdAt));
  res.json(rules.map(formatRule));
});

router.post("/scam-rules", async (req, res) => {
  const body = CreateScamRuleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [rule] = await db
    .insert(scamRulesTable)
    .values({
      pattern: body.data.pattern,
      description: body.data.description,
      ruleType: "custom",
    })
    .returning();

  res.status(201).json(formatRule(rule));
});

router.patch("/scam-rules/:id", async (req, res) => {
  const params = UpdateScamRuleParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateScamRuleBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const update: Record<string, unknown> = {};
  if (body.data.active !== undefined) update.active = body.data.active;
  if (body.data.description !== undefined) update.description = body.data.description;

  const [rule] = await db
    .update(scamRulesTable)
    .set(update)
    .where(eq(scamRulesTable.id, params.data.id))
    .returning();

  if (!rule) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(formatRule(rule));
});

router.delete("/scam-rules/:id", async (req, res) => {
  const params = DeleteScamRuleParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  // Prevent deleting builtin rules
  const [existing] = await db
    .select()
    .from(scamRulesTable)
    .where(eq(scamRulesTable.id, params.data.id));

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  if (existing.ruleType === "builtin") {
    res.status(403).json({ error: "Cannot delete builtin rules. Disable them instead." });
    return;
  }

  await db.delete(scamRulesTable).where(eq(scamRulesTable.id, params.data.id));
  res.status(204).send();
});

router.post("/scam-rules/scan", async (_req, res) => {
  // Load all active rules
  const rules = await db
    .select()
    .from(scamRulesTable)
    .where(eq(scamRulesTable.active, true));

  const apps = await db.select().from(applicationsTable);

  let flagged = 0;
  let cleared = 0;

  for (const app of apps) {
    const text = `${app.company} ${app.role} ${app.source ?? ""} ${app.notes ?? ""}`;
    let isScam = false;
    let scamReason: string | null = null;

    for (const rule of rules) {
      try {
        const re = new RegExp(rule.pattern, "i");
        if (re.test(text)) {
          isScam = true;
          scamReason = rule.description;
          break;
        }
      } catch {
        // Invalid regex — skip
      }
    }

    if (isScam !== app.isScam) {
      await db
        .update(applicationsTable)
        .set({ isScam, scamReason, updatedAt: new Date() })
        .where(eq(applicationsTable.id, app.id));

      if (isScam) flagged++;
      else cleared++;
    }
  }

  res.json({
    scanned: apps.length,
    flagged,
    cleared,
    message: `Scanned ${apps.length} applications: ${flagged} newly flagged, ${cleared} cleared`,
  });
});

// Mark application as safe
router.post("/applications/:id/mark-safe", async (req, res) => {
  const params = MarkApplicationSafeParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [app] = await db
    .update(applicationsTable)
    .set({ isScam: false, scamReason: null, updatedAt: new Date() })
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
    source: app.source,
    location: app.location,
    appliedAt: app.appliedAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    notes: app.notes,
    isScam: app.isScam,
    scamReason: app.scamReason,
    emailMessageId: app.emailMessageId,
    url: app.url,
  });
});

// Mark application as confirmed scam
router.post("/applications/:id/mark-scam", async (req, res) => {
  const params = MarkApplicationScamParams.safeParse({ id: Number(req.params.id) });

  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const bodyParsed = MarkApplicationScamBody.safeParse(req.body);
  const reason = bodyParsed.success ? (bodyParsed.data.reason ?? "Manually marked as scam") : "Manually marked as scam";

  const [app] = await db
    .update(applicationsTable)
    .set({ isScam: true, scamReason: reason, updatedAt: new Date() })
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({
    id: app.id,
    company: app.company,
    role: app.role,
    status: app.status,
    source: app.source,
    location: app.location,
    appliedAt: app.appliedAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    notes: app.notes,
    isScam: app.isScam,
    scamReason: app.scamReason,
    emailMessageId: app.emailMessageId,
    url: app.url,
  });
});

export default router;
