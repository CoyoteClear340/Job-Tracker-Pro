import { db, jobAlertsTable, applicationsTable, notificationsTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { logger } from "./logger";
import { sendAlertNotificationEmail, getEmailConfig } from "./email";

export async function scanAlerts(): Promise<{ matched: number }> {
  const alerts = await db
    .select()
    .from(jobAlertsTable)
    .where(eq(jobAlertsTable.active, true));

  if (alerts.length === 0) return { matched: 0 };

  const applications = await db.select().from(applicationsTable);

  let matched = 0;

  for (const alert of alerts) {
    const keyword = alert.keyword.toLowerCase();
    const alertCompany = alert.company?.toLowerCase();
    const alertLocation = alert.location?.toLowerCase();

    for (const app of applications) {
      const appCompany = app.company.toLowerCase();
      const appRole = app.role.toLowerCase();
      const appLocation = app.location?.toLowerCase();

      const keywordMatches = appRole.includes(keyword) || appCompany.includes(keyword);
      const companyMatches = !alertCompany || appCompany.includes(alertCompany);
      const locationMatches = !alertLocation || (appLocation && appLocation.includes(alertLocation));

      if (!keywordMatches || !companyMatches || !locationMatches) continue;

      const existing = await db
        .select()
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.alertId, alert.id),
            eq(notificationsTable.applicationId, app.id)
          )
        )
        .limit(1);

      if (existing.length > 0) continue;

      const message = `Alert "${alert.keyword}" matched: ${app.company} — ${app.role}`;

      const [notif] = await db
        .insert(notificationsTable)
        .values({
          alertId: alert.id,
          applicationId: app.id,
          message,
          emailSent: false,
        })
        .returning();

      matched++;
      logger.info({ alertId: alert.id, applicationId: app.id }, "Alert matched");

      const config = getEmailConfig();
      if (config.configured && notif) {
        const result = await sendAlertNotificationEmail({
          keyword: alert.keyword,
          company: app.company,
          role: app.role,
          applicationId: app.id,
        });

        if (result.success) {
          await db
            .update(notificationsTable)
            .set({ emailSent: true })
            .where(eq(notificationsTable.id, notif.id));
        }
      }
    }
  }

  return { matched };
}

export function startAlertScheduler(intervalMs = 60 * 60 * 1000) {
  logger.info({ intervalMs }, "Alert scanner scheduler started");

  scanAlerts()
    .then(({ matched }) => logger.info({ matched }, "Initial alert scan complete"))
    .catch((err) => logger.error({ err }, "Initial alert scan failed"));

  return setInterval(() => {
    scanAlerts()
      .then(({ matched }) => logger.info({ matched }, "Scheduled alert scan complete"))
      .catch((err) => logger.error({ err }, "Scheduled alert scan failed"));
  }, intervalMs);
}
