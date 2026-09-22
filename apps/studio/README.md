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
- Canonical, versioned essence, inventory, composition, and blueprint contracts
- Deterministic asymmetric-crescent generator with inventory and quality gates

## Local setup

1. Copy .env.example to .env.local.
2. Configure Clerk and Neon/Postgres credentials.
3. Install dependencies with npm install.
4. Apply drizzle/0000_foundation.sql or run the Drizzle migration flow.
5. Run npm run verify.
6. Run npm run dev.

Do not place provider credentials in client-side code.

## SaaS invariant

Every customer-owned query must be scoped through workspace membership and workspace_id.

The core design doctrine is: AI interprets. Evercrafted places.

The engine uses 0° at 12 o'clock, increasing clockwise. Physical Cartesian coordinates use +Y up; screen conversion is explicit and uses +Y down. A seed, locked inventory snapshot, and formula version must reproduce byte-identical blueprint JSON.
