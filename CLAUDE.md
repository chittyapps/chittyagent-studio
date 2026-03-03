# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyAgent Studio — a no-code AI agent builder for the ChittyOS ecosystem. Users create workflow agents, attach reusable skills from ChittyOS services, browse GitHub repositories, and use agent templates.

## Commands

```bash
npm run dev          # Start dev server (Express + Vite HMR on :5000)
npm run build        # Build client (Vite) + server (esbuild) to dist/
npm start            # Run production build (node dist/index.cjs)
npm run check        # TypeScript type check (tsc --noEmit)
npm run test         # Run all Vitest tests
npm run db:push      # Push Drizzle schema changes to PostgreSQL
```

Run a single test: `npx vitest run tests/<filename>.test.ts`

## Architecture

### Monorepo Structure (3 layers)

- **`shared/schema.ts`** — Single source of truth for all database tables (Drizzle ORM) and Zod validation schemas. Both client and server import from here.
- **`server/`** — Express 5 API with PostgreSQL via Drizzle ORM. All CRUD goes through `storage.ts` (implements `IStorage` interface). Routes use `asyncRoute()` wrapper for error handling and Zod for request validation.
- **`client/`** — React 18 SPA with Vite, wouter for routing, TanStack React Query for server state, shadcn/ui components, Tailwind CSS.

### Key Patterns

- **Schema-first**: Change `shared/schema.ts` first for any data model changes, then run `npm run db:push`
- **Storage abstraction**: Never use raw SQL — all DB access goes through `DatabaseStorage` class in `server/storage.ts`
- **API data fetching**: React Query with `apiRequest()` util from `client/src/lib/queryClient.ts`. Query keys are URL paths (e.g., `["/api/agents"]`). Default config: no refetch on focus, infinite staleTime, no retry.
- **Mutations**: Use `useMutationWithToast` hook (`client/src/hooks/use-mutation-with-toast.ts`) — wraps React Query mutations with automatic toast notifications
- **Route error handling**: All Express routes wrapped with `asyncRoute()` which catches async errors and returns 500
- **Templates vs Agents**: Both stored in the `agents` table, distinguished by `isTemplate` boolean

### TypeScript Path Aliases

- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`

### API Routes

All prefixed with `/api/`: agents CRUD (`/agents`), templates (`/templates`), skills (`/skills`), GitHub repos (`/github/repos`, `/github/sync`). See `server/routes.ts` for full definitions.

### Client Routes

`/` home, `/agents/new` and `/agents/:id/edit` (AgentBuilder), `/agents/:id` (AgentDetail), `/templates`, `/templates/:id`, `/skills`, `/repos`

### Component Organization

- Workflow-specific components (canvas, nodes) go in `client/src/components/workflow/`
- Agent builder page is `client/src/pages/agent-builder.tsx` — uses React Hook Form + Zod with a single form instance shared across tabs
- All UI constants (node types, compliance rules, categories, colors) are centralized in `client/src/lib/constants.ts` — never scatter in components

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `PORT` — Server port (default: 5000)

## Testing

Tests are in `tests/` using Vitest with `globals: true` (no imports needed for describe/it/expect). Environment is `node`. Test timeout is 15 seconds.

- Tests cover both logic validation AND adoption/convention enforcement (e.g., verifying `useMutationWithToast` is used across all pages)
- Implementation plans are stored in `docs/plans/` for multi-step features

## Gotchas

- Drizzle schema uses snake_case DB columns mapped to camelCase TS properties (e.g., `trigger_type` → `triggerType`)
- `server/seed.ts` auto-seeds templates, skills, and GitHub repos on first startup — don't duplicate seed data manually
- React Query `staleTime: Infinity` means data never auto-refetches; invalidate queries manually after mutations
- `actions`, `complianceConfig`, and `triggerConfig` are JSONB columns — use typed interfaces (`WorkflowData`, `ComplianceConfig`) from `shared/schema.ts`
- `storage.updateAgent()` auto-sets `updatedAt` — don't pass it manually

## UI Conventions

- shadcn/ui components live in `client/src/components/ui/` — add new ones via the shadcn pattern, don't hand-roll equivalents
- Dark mode is class-based via `next-themes` ThemeProvider — use CSS variables (HSL) for colors, not hardcoded values
- Client constants (colors, labels, categories) centralized in `client/src/lib/constants.ts`
