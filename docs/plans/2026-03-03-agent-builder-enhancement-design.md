# Agent Builder Enhancement Design

**Date:** 2026-03-03
**Status:** Approved

## Summary

Enhance the ChittyAgent Studio agent builder from a simple form into a full-featured workflow builder with a React Flow canvas, skill attachment, trigger configuration, and ChittyOS compliance validation.

## Architecture

### Layout: Tabbed Interface

Replace the current form-based agent builder with a 4-tab interface at `/agents/new` and `/agents/:id/edit`:

1. **Details** — existing metadata form (name, description, prompt, icon, color, category, status)
2. **Workflow** — React Flow canvas with extended node types, branching, and connections
3. **Skills** — searchable grid of ecosystem skills with attach/detach toggles
4. **Triggers** — trigger type selector with type-specific configuration forms

All tabs share a single form state. One "Save" button persists everything.

### New Dependency

- `@xyflow/react` (React Flow v12) — MIT-licensed, mature node-based canvas library

---

## Workflow Canvas

### Node Types (13 total)

**Flow Control:**
- **Trigger** — entry point, one per workflow, configures how the agent starts
- **Condition (if/else)** — branches based on expression, "true" and "false" output handles
- **Loop** — iterates over a collection, "each item" and "done" output handles
- **Delay/Wait** — pauses execution for a duration or until a condition
- **End** — terminal node, marks workflow completion

**Actions:**
- **AI/LLM Action** — send prompt to LLM, configure model/temperature/instructions
- **Skill Action** — execute an attached ecosystem skill (selected from Skills tab)
- **HTTP Request** — external API call (method, URL, headers, body)
- **Email** — send email notification
- **Code/Script** — run custom JavaScript transform
- **Data Transform** — map/filter/reshape data between steps
- **Sub-workflow** — reference another agent as a nested workflow
- **Notification** — send alert via configured channel

### Canvas Features

- Drag-and-drop nodes from a side palette
- Visual connections between node handles
- Pan and zoom
- Node configuration via click-to-open side panel
- Branching: Condition and Loop nodes have multiple output handles
- Nodes color-coded by category (flow control, actions, etc.)

---

## Compliance & Testing System

### Compliance Engine

Configurable ruleset system with three levels:

- **Permissive** — only critical graph validity checks
- **Recommended** (default) — baseline ChittyOS rules
- **Strict** — all rules enforced, no warnings only errors

### Default ChittyOS Baseline Rules (pre-selected)

- Workflow must have exactly one trigger node
- All paths must terminate at an End node
- Skills referenced must be installed/available in ChittyOS
- No unconnected/orphan nodes
- Error handling required for HTTP and external action nodes
- Sensitive data nodes must have output sanitization

### Optional/Configurable Rules (user toggles on/off)

- Must include notification on failure
- Max workflow depth (configurable limit)
- No code/script nodes (for locked-down environments)
- All LLM actions must specify a model
- Custom rules (user-defined expression-based)

### Test Runner

- Sample input data editor (JSON)
- Dry-run traces execution path through the graph
- Each node shows pass/fail/skip status with output preview
- Highlights which branch a condition took
- Catches errors before deploying to production

### UI Location

"Validate & Test" panel in the workflow tab toolbar — slides out from the right as a sidebar over the canvas. Shows a checklist of rules with pass/fail icons and a "Run Test" button.

---

## Skills Tab

- Searchable, filterable grid of all ecosystem skills from `/api/skills`
- Search bar to filter by name/description
- Category filter chips (All, Productivity, Communication, Data, etc.)
- Skill cards: icon, name, description, category badge, install count
- Attach/Detach toggle on each card
- Attached skills summary at the top (count and names)
- Attached skills become available as "Skill Action" nodes in the workflow canvas

---

## Triggers Tab

Trigger type selector (4 cards) at the top with type-specific config below:

- **Manual** — no extra config
- **Scheduled** — visual cron builder (dropdowns for minute/hour/day/month/weekday) with human-readable preview
- **Email** — from address filter, subject keyword filter, body keyword filter
- **Webhook** — auto-generated webhook URL, optional secret/auth header, payload schema preview

---

## Data Model Changes

All changes in `shared/schema.ts`. No new tables needed.

### `actions` JSONB field — formalized structure

```typescript
{
  nodes: Array<{
    id: string
    type: string  // "trigger" | "condition" | "llmAction" | "skillAction" | etc.
    position: { x: number, y: number }
    data: Record<string, unknown>  // node-specific config
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string  // for branching ("true" | "false")
    label?: string
  }>
}
```

### New `complianceConfig` JSONB field

```typescript
{
  level: "permissive" | "recommended" | "strict"
  enabledRules: string[]
  customRules: Array<{ id: string, name: string, expression: string }>
}
```

### Existing fields (no changes)

- `triggerConfig` JSONB — stores type-specific config (cron, webhook URL, email filters)
- `skillIds` text[] — stores attached skill IDs

---

## File Impact

| Area | Files |
|------|-------|
| Schema | `shared/schema.ts` — add `complianceConfig` field, Zod types for workflow/compliance |
| Agent builder | `client/src/pages/agent-builder.tsx` — rewrite as tabbed interface |
| Workflow canvas | New: `client/src/components/workflow/` — canvas, node types, palette, config panel |
| Skills tab | New: `client/src/components/skills-picker.tsx` |
| Triggers tab | New: `client/src/components/trigger-config.tsx` |
| Compliance | New: `client/src/components/workflow/compliance-panel.tsx` |
| Constants | `client/src/lib/constants.ts` — node type definitions, compliance rules |
| DB migration | `npm run db:push` after schema change |
