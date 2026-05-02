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

Gmail OAuth integration was NOT set up (user dismissed the flow). The connector ID is:
`connector:ccfg_google-mail_B959E7249792448ABBA58D46AF`

To enable Gmail sync in the future:
1. Run `proposeIntegration("connector:ccfg_google-mail_B959E7249792448ABBA58D46AF")` in the integrations skill
2. After the user completes OAuth, call `addIntegration` with the returned connection ID
3. Copy the rendered snippet into `artifacts/api-server/src/lib/gmail-client.ts`
4. The gmail routes in `artifacts/api-server/src/routes/gmail.ts` already import from that path dynamically

Alternatively, the user can provide a Google OAuth refresh token + client credentials manually as secrets.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
