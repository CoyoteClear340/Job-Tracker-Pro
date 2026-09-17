# TERM_TRACK — Job & Internship Tracker

A full-stack job/internship application tracker that syncs with Gmail to automatically detect application-related emails, infer status changes, flag likely scam messages, and surface everything on a fast, terminal-themed dashboard.

## Features

- **Applications tracker** — company, role, status (`applied → interview → offer/rejected/ghosted`), source, location, notes, and originating URL for every application, with full CRUD via the dashboard.
- **Gmail sync** — regex/keyword-based scan of recent inbox messages (full body, not just snippets) that creates or updates applications automatically, keyed off the Gmail message ID to avoid duplicates, with best-effort job-title extraction from common ATS phrasing. Runs automatically every 15 minutes once configured (see [Gmail integration](#gmail-integration)), plus on-demand via the "Sync" button in the UI; safely no-ops with a clear status message until credentials are set.
- **Status detection** — subject/body pattern matching classifies emails into `applied`, `interview`, `rejected`, or `offer`.
- **Scam detection** — flags suspicious messages (e.g. interview/OA links with no application on file, wire transfer/gift card/crypto requests, "no experience needed" spam) with editable built-in and custom detection rules.
- **Job alerts** — keyword/company/location watchers that scan tracked applications hourly and generate notifications (with optional email delivery) when a match is found.
- **Reminders & ghosting** — per-application follow-up reminders with a daily 8am email digest summarizing what's due, due today, or overdue.
- **Analytics dashboard** — response/interview/offer rates and pipeline breakdowns over your tracked applications.
- **Notifications center** — in-app read/unread notification feed backed by alert matches.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, wouter (routing), TanStack Query, Tailwind CSS v4, shadcn/ui (Radix), Recharts |
| Backend | Node.js 24, Express 5, pino logging |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod (`zod/v4`), `drizzle-zod` |
| API contract | OpenAPI spec → Orval-generated React Query hooks + Zod schemas |
| Email | Nodemailer (SMTP) |
| Monorepo | pnpm workspaces, TypeScript project references, esbuild |

> Note: the original product spec (`attached_assets/`) called for Next.js + Prisma; the implemented stack uses Vite + Express + Drizzle instead.

## Project structure

```
artifacts/
  job-tracker/        # React/Vite frontend (dashboard, applications, alerts, scam detection, analytics)
  api-server/          # Express 5 REST API (applications, gmail, alerts, scam-rules, notifications, reminders, analytics)
  mockup-sandbox/       # Design/mockup sandbox
lib/
  db/                  # Drizzle schema + client (@workspace/db)
  api-spec/            # OpenAPI source spec + Orval codegen config
  api-zod/              # Generated Zod schemas from the OpenAPI spec
  api-client-react/     # Generated React Query hooks from the OpenAPI spec
scripts/               # Workspace tooling (e.g. post-merge hook)
```

### Database schema (`lib/db/src/schema`)

- `applications` — company, role, status enum (`applied|interview|offer|rejected|ghosted`), source, location, notes, url, scam flag/reason, Gmail message id, timestamps.
- `job_alerts` — keyword, company, location, active flag.
- `notifications` — linked to an alert and/or application, message, read/email-sent flags.
- `reminders` — linked to an application, due date, note, done flag.
- `scam_rules` — pattern, description, rule type (`builtin|custom`), active flag.
- `gmail_sync` — last sync timestamp and total emails processed.

### API routes (`artifacts/api-server/src/routes`)

`/healthz`, `/applications`, `/gmail/sync`, `/gmail/status`, `/alerts`, `/scam-rules`, `/notifications`, `/analytics`, `/reminders`.

## Getting started

Requires Node.js 24 and pnpm (npm/yarn are blocked by a `preinstall` guard).

```bash
pnpm install
pnpm run typecheck   # full workspace typecheck
pnpm run build        # typecheck + build all packages
```

Run the pieces individually during development:

```bash
pnpm --filter @workspace/api-server run dev     # API server (builds + starts)
pnpm --filter @workspace/job-tracker run dev     # Vite dev server for the dashboard
```

Regenerate API types/hooks after changing the OpenAPI spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

Push Drizzle schema changes to the database (dev only):

```bash
pnpm --filter @workspace/db run push
```

## Gmail integration

Gmail sync uses a manually issued OAuth refresh token via `googleapis` (`artifacts/api-server/src/lib/gmail-client.ts`) — no Replit connector needed. Set these environment variables on the API server to enable it:

| Variable | Required | Notes |
|---|---|---|
| `GOOGLE_CLIENT_ID` | yes | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | yes | OAuth client secret |
| `GOOGLE_REFRESH_TOKEN` | yes | Refresh token for a user who granted the Gmail readonly scope |
| `GOOGLE_REDIRECT_URI` | no | Defaults to `https://developers.google.com/oauthplayground` |

To obtain a refresh token: create an OAuth client (type "Web application") in Google Cloud Console, enable the Gmail API, add `https://developers.google.com/oauthplayground` as an authorized redirect URI, then use the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) (gear icon → "Use your own OAuth credentials") to authorize the `https://www.googleapis.com/auth/gmail.readonly` scope and exchange the auth code for a refresh token.

Once configured:
- `GET /gmail/status` reports `connected: true`.
- `POST /gmail/sync` (also triggered from the dashboard) pulls messages from the last 7 days and classifies them.
- A background scheduler (`startGmailSyncScheduler` in `artifacts/api-server/src/index.ts`) re-syncs automatically every 15 minutes.

`googleapis` is listed in `build.mjs`'s esbuild `external` array, so it's resolved from `node_modules` at runtime rather than bundled.

Prefer brokering OAuth through Replit's connector flow instead? The connector id is documented in `replit.md` — swap the implementation in `gmail-client.ts` for the connector-issued client and the rest of the sync pipeline (`gmail-sync.ts`) needs no changes.

## Email (alerts & reminder digest)

Alert notifications and the daily reminder digest are sent via SMTP through `artifacts/api-server/src/lib/email.ts`. Configure SMTP credentials as environment variables for `getEmailConfig()` to report `configured: true`; without them, matches/reminders are still recorded but no email is sent.

## Status

This is a work-in-progress project. Let me know what you'd like added or changed next (e.g. finishing Gmail OAuth, authentication/multi-user support, resume parsing, career-page monitoring for job alerts, deployment config) and I'll implement it.
