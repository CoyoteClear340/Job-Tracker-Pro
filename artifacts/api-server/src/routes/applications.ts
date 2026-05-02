import { Router } from "express";
import { db, applicationsTable } from "@workspace/db";
import { eq, desc, ilike, and, gte, sql } from "drizzle-orm";
import {
  ListApplicationsQueryParams,
  CreateApplicationBody,
  GetApplicationParams,
  UpdateApplicationParams,
  UpdateApplicationBody,
  DeleteApplicationParams,
  AddApplicationNoteParams,
  AddApplicationNoteBody,
  GetRecentActivityQueryParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/applications", async (req, res) => {
  const query = ListApplicationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query parameters" });
    return;
  }
  const { status, search, source } = query.data;

  const conditions = [];
  if (status) conditions.push(eq(applicationsTable.status, status));
  if (source) conditions.push(ilike(applicationsTable.source, `%${source}%`));
  if (search) {
    conditions.push(
      sql`(${applicationsTable.company} ilike ${"%" + search + "%"} or ${applicationsTable.role} ilike ${"%" + search + "%"})`
    );
  }

  const apps = await db
    .select()
    .from(applicationsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(applicationsTable.updatedAt));

  res.json(apps.map(formatApplication));
});

router.post("/applications", async (req, res) => {
  const body = CreateApplicationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const [app] = await db
    .insert(applicationsTable)
    .values({
      company: body.data.company,
      role: body.data.role,
      status: (body.data.status as "applied" | "interview" | "offer" | "rejected" | "ghosted") ?? "applied",
      source: body.data.source ?? null,
      location: body.data.location ?? null,
      notes: body.data.notes ?? null,
      url: body.data.url ?? null,
      appliedAt: body.data.appliedAt ?? new Date(),
    })
    .returning();

  res.status(201).json(formatApplication(app));
});

router.post("/applications/bulk", async (req, res) => {
  const { ids, action, status } = req.body as { ids: number[]; action: string; status?: string };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }

  const idList = ids.map(Number).filter(Boolean);

  if (action === "updateStatus") {
    const validStatuses = ["applied", "interview", "offer", "rejected", "ghosted"];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: "Valid status required for updateStatus" });
      return;
    }
    await db
      .update(applicationsTable)
      .set({ status: status as "applied" | "interview" | "offer" | "rejected" | "ghosted", updatedAt: new Date() })
      .where(sql`${applicationsTable.id} = ANY(${idList})`);
    res.json({ affected: idList.length, action });
    return;
  }

  if (action === "markScam") {
    await db
      .update(applicationsTable)
      .set({ isScam: true, updatedAt: new Date() })
      .where(sql`${applicationsTable.id} = ANY(${idList})`);
    res.json({ affected: idList.length, action });
    return;
  }

  if (action === "delete") {
    await db
      .delete(applicationsTable)
      .where(sql`${applicationsTable.id} = ANY(${idList})`);
    res.json({ affected: idList.length, action });
    return;
  }

  res.status(400).json({ error: "Unknown action" });
});

router.get("/applications/stats", async (_req, res) => {
  const apps = await db.select().from(applicationsTable);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = {
    total: apps.length,
    applied: apps.filter((a) => a.status === "applied").length,
    interview: apps.filter((a) => a.status === "interview").length,
    offer: apps.filter((a) => a.status === "offer").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    ghosted: apps.filter((a) => a.status === "ghosted").length,
    responseRate:
      apps.length > 0
        ? Math.round(
            ((apps.filter((a) => a.status !== "applied" && a.status !== "ghosted").length) /
              apps.length) *
              100
          )
        : 0,
    thisWeek: apps.filter((a) => a.appliedAt >= weekAgo).length,
    thisMonth: apps.filter((a) => a.appliedAt >= monthAgo).length,
  };

  res.json(stats);
});

router.get("/applications/recent", async (req, res) => {
  const query = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = query.success ? query.data.limit : 10;

  const apps = await db
    .select()
    .from(applicationsTable)
    .orderBy(desc(applicationsTable.updatedAt))
    .limit(limit);

  res.json(apps.map(formatApplication));
});

router.get("/applications/needs-attention", async (req, res) => {
  const staleDays = Math.max(1, parseInt(String(req.query["staleDays"] ?? "7"), 10) || 7);
  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  const apps = await db
    .select()
    .from(applicationsTable)
    .orderBy(applicationsTable.updatedAt);

  const stale = apps.filter(
    (a) =>
      a.updatedAt <= cutoff &&
      a.status !== "offer" &&
      a.status !== "rejected"
  );

  const now = Date.now();
  res.json(
    stale.map((a) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
      location: a.location,
      updatedAt: a.updatedAt.toISOString(),
      appliedAt: a.appliedAt.toISOString(),
      daysSinceUpdate: Math.floor((now - a.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
      isScam: a.isScam,
    }))
  );
});

router.get("/applications/export", async (req, res) => {
  const apps = await db
    .select()
    .from(applicationsTable)
    .orderBy(desc(applicationsTable.appliedAt));

  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headers = ["ID", "Company", "Role", "Status", "Source", "Location", "Applied At", "Updated At", "Is Scam", "Scam Reason", "URL", "Notes"];
  const rows = apps.map((a) => [
    a.id,
    a.company,
    a.role,
    a.status,
    a.source ?? "",
    a.location ?? "",
    a.appliedAt.toISOString(),
    a.updatedAt.toISOString(),
    a.isScam ? "YES" : "NO",
    a.scamReason ?? "",
    a.url ?? "",
    a.notes ?? "",
  ]);

  const csv = [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");

  const filename = `term_track_export_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
});

router.get("/applications/:id", async (req, res) => {
  const params = GetApplicationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, params.data.id));

  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(formatApplication(app));
});

router.put("/applications/:id", async (req, res) => {
  const params = UpdateApplicationParams.safeParse({ id: Number(req.params.id) });
  const body = UpdateApplicationBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (body.data.company !== undefined) update.company = body.data.company;
  if (body.data.role !== undefined) update.role = body.data.role;
  if (body.data.status !== undefined) update.status = body.data.status;
  if (body.data.source !== undefined) update.source = body.data.source;
  if (body.data.location !== undefined) update.location = body.data.location;
  if (body.data.notes !== undefined) update.notes = body.data.notes;
  if (body.data.url !== undefined) update.url = body.data.url;
  if (body.data.isScam !== undefined) update.isScam = body.data.isScam;
  if (body.data.scamReason !== undefined) update.scamReason = body.data.scamReason;

  const [app] = await db
    .update(applicationsTable)
    .set(update)
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(formatApplication(app));
});

router.delete("/applications/:id", async (req, res) => {
  const params = DeleteApplicationParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  await db.delete(applicationsTable).where(eq(applicationsTable.id, params.data.id));
  res.status(204).send();
});

router.post("/applications/:id/notes", async (req, res) => {
  const params = AddApplicationNoteParams.safeParse({ id: Number(req.params.id) });
  const body = AddApplicationNoteBody.safeParse(req.body);

  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const [app] = await db
    .update(applicationsTable)
    .set({ notes: body.data.notes, updatedAt: new Date() })
    .where(eq(applicationsTable.id, params.data.id))
    .returning();

  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(formatApplication(app));
});

function formatApplication(app: typeof applicationsTable.$inferSelect) {
  return {
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
  };
}

export default router;
