# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Artifacts

### Job & Internship Tracker (`artifacts/job-tracker`)
- **Preview path**: `/`
- **Type**: react-vite
- **Description**: Full-stack job application tracker with Gmail sync, status tracking, scam detection, and job alerts dashboard

### API Server (`artifacts/api-server`)
- **Preview path**: `/api`
- **Type**: Express 5 REST API
- **Routes**: `/applications`, `/gmail/*`, `/alerts`, `/healthz`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `applications` — job applications (company, role, status, source, location, notes, url, is_scam, scam_reason, email_message_id)
- `job_alerts` — keyword-based job alerts (keyword, company, location, active)
- `gmail_sync` — Gmail sync state (last_sync_at, total_emails_processed)

## Gmail Integration Note

`artifacts/api-server/src/lib/gmail-client.ts` now implements Gmail access via `googleapis` using a manually supplied OAuth refresh token — no Replit connector required. It's considered "configured" once these env vars are set on the API server:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_REDIRECT_URI` (optional, defaults to `https://developers.google.com/oauthplayground`)

`artifacts/api-server/src/lib/gmail-sync.ts` holds the sync logic (`syncGmail()`), fetches full message bodies (not just snippets) to extract company/role/status, and runs on a 15-minute interval scheduler (`startGmailSyncScheduler`, started from `index.ts`) in addition to the manual `POST /gmail/sync` trigger. `googleapis` is externalized in `build.mjs` so esbuild doesn't try to bundle it.

The Replit connector ID (`connector:ccfg_google-mail_B959E7249792448ABBA58D46AF`) is still available as an alternative path if OAuth should be brokered through Replit instead of manual refresh-token secrets — in that case, replace the implementation in `gmail-client.ts` with the connector-issued client instead.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
