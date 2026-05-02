import { Router } from "express";
import { db, applicationsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

router.get("/analytics", async (_req, res) => {
  const apps = await db.select().from(applicationsTable).orderBy(desc(applicationsTable.appliedAt));

  const STATUSES = ["applied", "interview", "offer", "rejected", "ghosted"] as const;
  type Status = (typeof STATUSES)[number];

  // Status totals
  const statusTotals = { applied: 0, interview: 0, offer: 0, rejected: 0, ghosted: 0 };
  for (const a of apps) {
    if (a.status in statusTotals) statusTotals[a.status as Status]++;
  }

  // By month (last 12 months based on appliedAt)
  const monthMap = new Map<string, { applied: number; interview: number; offer: number; rejected: number; ghosted: number; total: number }>();
  for (const a of apps) {
    const d = a.appliedAt;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(month)) {
      monthMap.set(month, { applied: 0, interview: 0, offer: 0, rejected: 0, ghosted: 0, total: 0 });
    }
    const bucket = monthMap.get(month)!;
    if (a.status in bucket) bucket[a.status as Status]++;
    bucket.total++;
  }

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, data]) => ({ month, ...data }));

  // By source
  const sourceMap = new Map<string, { count: number; responseCount: number }>();
  for (const a of apps) {
    const source = a.source?.trim() || "Unknown";
    if (!sourceMap.has(source)) sourceMap.set(source, { count: 0, responseCount: 0 });
    const bucket = sourceMap.get(source)!;
    bucket.count++;
    if (a.status !== "applied" && a.status !== "ghosted") bucket.responseCount++;
  }

  const bySource = Array.from(sourceMap.entries())
    .map(([source, data]) => ({ source, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const responded = apps.filter((a) => a.status !== "applied" && a.status !== "ghosted").length;
  const overallResponseRate = apps.length > 0 ? Math.round((responded / apps.length) * 100 * 10) / 10 : 0;

  res.json({
    byMonth,
    bySource,
    statusTotals,
    totalApplications: apps.length,
    overallResponseRate,
  });
});

export default router;
