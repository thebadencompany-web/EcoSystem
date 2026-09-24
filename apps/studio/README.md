# Evercrafted Studio SaaS

Production SaaS foundation for Evercrafted Studio.

## Current foundation

- Next.js App Router / TypeScript
- Clerk authentication boundary
- Neon/Postgres + Drizzle
- Workspace membership model
- Tenant-owned projects
- Tenant-owned materials
- Immutable blueprint revision model
- Render job ledger
- AI usage/cost ledger
- Project asset registry
- 12 versioned Evercrafted composition formulas

## Local setup

1. Copy .env.example to .env.local.
2. Configure Clerk and Neon/Postgres credentials.
3. Install dependencies with npm install.
4. Apply drizzle/0000_foundation.sql or run the Drizzle migration flow.
5. Run npm run typecheck.
6. Run npm run dev.

Do not place provider credentials in client-side code.

## SaaS invariant

Every customer-owned query must be scoped through workspace membership and workspace_id.

The core design doctrine is: AI interprets. Evercrafted places.


## Reverse Engineer image storage

Reverse Engineer uses **Vercel Blob private storage** for uploaded wreath images.

Production setup:
1. In Vercel, open the Studio project and create/connect a Blob store with **Private** access.
2. New Vercel Blob stores use project-scoped OIDC by default, so deployed Functions can call `@vercel/blob` without exposing a static token.
3. For local development, use the Blob credentials pulled from the linked Vercel project when required by the CLI/SDK.
4. Set `COMET_API_KEY` in the server environment for image analysis.

Flow:
`file picker -> /api/reverse/upload -> private Blob -> reverse_imports -> /api/reverse analyze -> review -> commit -> project + blueprint`.

The browser never receives a permanent public source-image URL. Preview bytes are streamed through `/api/reverse/source?id=...` after Clerk/workspace authorization, and analysis reads the private Blob server-side.
