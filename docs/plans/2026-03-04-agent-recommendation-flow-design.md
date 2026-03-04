# Automated Agent Recommendation Flow — Design

## Overview

An intelligent recommendation system for ChittyAgent Studio that analyzes a user's natural language description and generates a complete agent configuration — including name, skills, workflow graph, trigger, and compliance settings. Powered by chittygateway (Cloudflare Agents SDK + Workers AI).

## Entry Points

1. **Dedicated Wizard** — New `/agents/recommend` route with a 3-step flow: Describe → Review → Accept
2. **Inline Hints** — Contextual recommendations on existing agent builder tabs

## Architecture

### Approach: Single Recommendation Endpoint

One `POST /api/recommendations/generate` route handles all recommendation requests. The server calls chittygateway (a Cloudflare Agent), validates the response, stores it, and returns it to the client.

### Gateway Integration (Cloudflare Agents SDK)

chittygateway runs as an `AIChatAgent` Durable Object on Cloudflare:
- Uses Workers AI (`@cf/meta/llama-4-scout-17b-16e-instruct` or similar) — no external API keys
- Has server-side tools: `matchSkills`, `generateWorkflow`, `selectTemplate`
- Receives available skills/templates as context from our server
- Returns structured JSON recommendation (not a chat stream)

**Call flow:**
```
Client → POST /api/recommendations/generate { prompt, category?, triggerType? }
  → Server fetches all skills + templates from DB
  → Server POSTs to CHITTYGATEWAY_URL with { prompt, availableSkills, availableTemplates }
  → Cloudflare Agent processes with Workers AI + tools
  → Returns structured RecommendationResponse
  → Server validates skill IDs, stores in recommendations table
  → Returns to client
```

**Environment variable:** `CHITTYGATEWAY_URL` — deployed Cloudflare Worker URL (no API key needed)

## Data Model

### New Types (`shared/schema.ts`)

```typescript
interface RecommendationRequest {
  prompt: string;
  category?: string;
  triggerType?: string;
}

interface RecommendationResponse {
  name: string;
  description: string;
  prompt: string;
  category: string;
  icon: string;
  color: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  skillIds: string[];
  actions: WorkflowData;
  confidence: number;       // 0-1
  reasoning: string;
}
```

### New Table: `recommendations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | varchar(36) PK | UUID |
| `prompt` | text | User's natural language input |
| `category` | text | Inferred or provided |
| `result` | jsonb | Full RecommendationResponse |
| `confidence` | real | Gateway confidence score |
| `accepted` | boolean | Did user create an agent from this? |
| `agent_id` | varchar(36) | Linked agent if accepted |
| `created_at` | timestamp | Auto |

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/recommendations/generate` | Call chittygateway, return full agent config |
| `GET` | `/api/recommendations` | List past recommendations (history) |
| `PATCH` | `/api/recommendations/:id/accept` | Mark accepted, link to agent |

## UI Design

### Recommendation Wizard (`/agents/recommend`)

**Step 1 — Describe:**
- Large textarea: "Describe the agent you want to build..."
- Optional dropdowns: category, trigger type
- Submit button → calls generate endpoint
- Loading state with progress animation

**Step 2 — Review:**
- Agent identity card (name, icon, color, category) — editable inline
- Suggested skills with relevance reasoning — toggle on/off
- Workflow preview (read-only React Flow canvas)
- Trigger config summary
- Confidence score badge + expandable reasoning

**Step 3 — Accept/Tweak:**
- "Create Agent" → creates agent from recommendation, marks as accepted
- "Open in Builder" → pre-fills agent builder for manual tweaking
- "Try Again" → back to step 1 with prompt preserved

### Inline Hints on Agent Builder

- **Details tab:** After typing description (debounced 1s), show "Get AI recommendations" banner linking to wizard pre-filled
- **Skills tab:** "Recommended for you" section at top of skills grid based on current category + description
- **Workflow tab:** Suggested starter nodes in palette sidebar with "Recommended" badge

## Error Handling

- **Gateway unavailable:** "Recommendation service unavailable" error state with option to create manually
- **No matching skills:** Return recommendation with empty skillIds and reasoning note
- **Invalid workflow:** Server validates against WorkflowData schema; return partial recommendation without workflow if invalid
- **Rate limiting:** Debounce inline hints (1s), disable generate button during request
- **Missing env var:** If CHITTYGATEWAY_URL not set, routes return 503, UI hides recommendation features

## Testing Strategy

- Recommendation request/response Zod validation
- Gateway payload construction (skills/templates context assembly)
- Skill ID validation against actual DB records
- Full flow with mocked gateway response → stored recommendation → accepted agent
- Convention enforcement: `useMutationWithToast` for mutations, `asyncRoute()` for routes
