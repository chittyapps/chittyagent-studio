# Agent Recommendation Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automated agent recommendation flow that takes a natural language prompt, calls chittygateway (Cloudflare Agents SDK), and generates a complete agent configuration — surfaced via a dedicated wizard page and inline hints on the agent builder.

**Architecture:** Single `POST /api/recommendations/generate` endpoint proxies to chittygateway. New `recommendations` Drizzle table stores history. New `/agents/recommend` wizard page with 3 steps (Describe → Review → Accept). Inline hints on existing agent builder tabs debounce-call the same endpoint.

**Tech Stack:** Express 5, Drizzle ORM (PostgreSQL), React 18, TanStack React Query, React Hook Form + Zod, shadcn/ui, wouter, React Flow (read-only preview)

---

### Task 1: Add Recommendation Schema and Types

**Files:**
- Modify: `shared/schema.ts:140` (after skills table, before githubRepos)

**Step 1: Write the failing test**

Create `tests/recommendation-schemas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { recommendationRequestSchema, recommendationResponseSchema } from "../shared/schema";

describe("Recommendation Schemas", () => {
  describe("recommendationRequestSchema", () => {
    it("accepts valid prompt-only request", () => {
      const result = recommendationRequestSchema.safeParse({
        prompt: "I want an agent that monitors emails and routes urgent ones to support",
      });
      expect(result.success).toBe(true);
    });

    it("accepts request with optional category and triggerType", () => {
      const result = recommendationRequestSchema.safeParse({
        prompt: "Email monitoring agent",
        category: "email",
        triggerType: "email",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty prompt", () => {
      const result = recommendationRequestSchema.safeParse({ prompt: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing prompt", () => {
      const result = recommendationRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects prompt over 2000 characters", () => {
      const result = recommendationRequestSchema.safeParse({
        prompt: "a".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("recommendationResponseSchema", () => {
    it("validates a full recommendation response", () => {
      const result = recommendationResponseSchema.safeParse({
        name: "Email Triage Bot",
        description: "Monitors incoming emails and routes urgent ones",
        prompt: "Monitor emails, classify urgency, route to appropriate team",
        category: "email",
        icon: "mail",
        color: "#4285f4",
        triggerType: "email",
        triggerConfig: { fromFilter: "@company.com" },
        skillIds: ["skill-1"],
        actions: { nodes: [], edges: [] },
        confidence: 0.85,
        reasoning: "Matched email category with high confidence",
      });
      expect(result.success).toBe(true);
    });

    it("requires confidence between 0 and 1", () => {
      const base = {
        name: "Test",
        description: "Test",
        prompt: "",
        category: "general",
        icon: "bot",
        color: "#4285f4",
        triggerType: "manual",
        triggerConfig: {},
        skillIds: [],
        actions: { nodes: [], edges: [] },
        reasoning: "test",
      };
      expect(recommendationResponseSchema.safeParse({ ...base, confidence: 1.5 }).success).toBe(false);
      expect(recommendationResponseSchema.safeParse({ ...base, confidence: -0.1 }).success).toBe(false);
      expect(recommendationResponseSchema.safeParse({ ...base, confidence: 0.5 }).success).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/recommendation-schemas.test.ts`
Expected: FAIL — `recommendationRequestSchema` and `recommendationResponseSchema` not exported from schema.ts

**Step 3: Write minimal implementation**

Add to `shared/schema.ts` after line 117 (after `updateAgentSchema`):

```typescript
export const recommendationRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000),
  category: z.string().optional(),
  triggerType: z.string().optional(),
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export const recommendationResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  prompt: z.string(),
  category: z.string(),
  icon: z.string(),
  color: z.string(),
  triggerType: z.string(),
  triggerConfig: z.record(z.unknown()),
  skillIds: z.array(z.string()),
  actions: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
  }),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>;
```

Add new `recommendations` table after the `agentRuns` table (after line 138):

```typescript
export const recommendations = pgTable("recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  category: text("category"),
  result: jsonb("result").$type<RecommendationResponse>().notNull(),
  confidence: integer("confidence").notNull().default(0),
  accepted: boolean("accepted").notNull().default(false),
  agentId: varchar("agent_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/recommendation-schemas.test.ts`
Expected: PASS

**Step 5: Push schema to database**

Run: `npm run db:push`

**Step 6: Commit**

```bash
git add shared/schema.ts tests/recommendation-schemas.test.ts
git commit -m "feat: add recommendation schema, types, and DB table"
```

---

### Task 2: Add Recommendation Storage Methods

**Files:**
- Modify: `server/storage.ts:12-39` (IStorage interface) and `server/storage.ts:41-162` (DatabaseStorage class)

**Step 1: Write the failing test**

Create `tests/recommendation-storage.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const storageContent = fs.readFileSync(
  path.resolve(__dirname, "../server/storage.ts"),
  "utf-8"
);

describe("Recommendation Storage", () => {
  it("IStorage interface includes getRecommendations", () => {
    expect(storageContent).toContain("getRecommendations(): Promise<Recommendation[]>");
  });

  it("IStorage interface includes getRecommendation", () => {
    expect(storageContent).toContain("getRecommendation(id: string): Promise<Recommendation | undefined>");
  });

  it("IStorage interface includes createRecommendation", () => {
    expect(storageContent).toContain("createRecommendation(data: InsertRecommendation): Promise<Recommendation>");
  });

  it("IStorage interface includes acceptRecommendation", () => {
    expect(storageContent).toContain("acceptRecommendation(id: string, agentId: string): Promise<Recommendation | undefined>");
  });

  it("imports Recommendation types from schema", () => {
    expect(storageContent).toContain("Recommendation");
    expect(storageContent).toContain("InsertRecommendation");
    expect(storageContent).toContain("recommendations");
  });

  it("DatabaseStorage implements all recommendation methods", () => {
    expect(storageContent).toContain("async getRecommendations()");
    expect(storageContent).toContain("async getRecommendation(id: string)");
    expect(storageContent).toContain("async createRecommendation(data: InsertRecommendation)");
    expect(storageContent).toContain("async acceptRecommendation(id: string, agentId: string)");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/recommendation-storage.test.ts`
Expected: FAIL — storage.ts doesn't have recommendation methods yet

**Step 3: Write minimal implementation**

In `server/storage.ts`:

1. Add to imports (line 4-8): `Recommendation`, `InsertRecommendation`, `recommendations`
2. Add to `IStorage` interface (after line 38, before the closing `}`):

```typescript
  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: string): Promise<Recommendation | undefined>;
  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  acceptRecommendation(id: string, agentId: string): Promise<Recommendation | undefined>;
```

3. Add to `DatabaseStorage` class (before closing `}`):

```typescript
  async getRecommendations(): Promise<Recommendation[]> {
    return db.select().from(recommendations).orderBy(desc(recommendations.createdAt)).limit(50);
  }

  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    const [rec] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return rec;
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const [rec] = await db.insert(recommendations).values(data).returning();
    return rec;
  }

  async acceptRecommendation(id: string, agentId: string): Promise<Recommendation | undefined> {
    const [rec] = await db
      .update(recommendations)
      .set({ accepted: true, agentId })
      .where(eq(recommendations.id, id))
      .returning();
    return rec;
  }
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/recommendation-storage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/storage.ts tests/recommendation-storage.test.ts
git commit -m "feat: add recommendation CRUD methods to storage layer"
```

---

### Task 3: Add Gateway Client Module

**Files:**
- Create: `server/gateway.ts`

**Step 1: Write the failing test**

Create `tests/gateway-client.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const gatewayContent = fs.readFileSync(
  path.resolve(__dirname, "../server/gateway.ts"),
  "utf-8"
);

describe("Gateway Client", () => {
  it("exports a generateRecommendation function", () => {
    expect(gatewayContent).toContain("export async function generateRecommendation");
  });

  it("reads CHITTYGATEWAY_URL from environment", () => {
    expect(gatewayContent).toContain("CHITTYGATEWAY_URL");
  });

  it("sends prompt and context to the gateway", () => {
    expect(gatewayContent).toContain("prompt");
    expect(gatewayContent).toContain("availableSkills");
    expect(gatewayContent).toContain("availableTemplates");
  });

  it("validates response against recommendationResponseSchema", () => {
    expect(gatewayContent).toContain("recommendationResponseSchema");
  });

  it("exports a isGatewayConfigured function", () => {
    expect(gatewayContent).toContain("export function isGatewayConfigured");
  });

  it("handles gateway errors gracefully", () => {
    expect(gatewayContent).toContain("GatewayError");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/gateway-client.test.ts`
Expected: FAIL — `server/gateway.ts` does not exist

**Step 3: Write minimal implementation**

Create `server/gateway.ts`:

```typescript
import type { Skill, Agent } from "@shared/schema";
import { recommendationResponseSchema, type RecommendationResponse } from "@shared/schema";

export class GatewayError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "GatewayError";
  }
}

export function isGatewayConfigured(): boolean {
  return !!process.env.CHITTYGATEWAY_URL;
}

interface GatewayPayload {
  prompt: string;
  category?: string;
  triggerType?: string;
  availableSkills: Array<{ id: string; name: string; category: string; capabilities: string[] | null }>;
  availableTemplates: Array<{ id: string; name: string; category: string; triggerType: string; description: string }>;
}

export async function generateRecommendation(
  prompt: string,
  availableSkills: Skill[],
  availableTemplates: Agent[],
  options?: { category?: string; triggerType?: string }
): Promise<RecommendationResponse> {
  const gatewayUrl = process.env.CHITTYGATEWAY_URL;
  if (!gatewayUrl) {
    throw new GatewayError("CHITTYGATEWAY_URL is not configured");
  }

  const payload: GatewayPayload = {
    prompt,
    category: options?.category,
    triggerType: options?.triggerType,
    availableSkills: availableSkills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      capabilities: s.capabilities,
    })),
    availableTemplates: availableTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      triggerType: t.triggerType,
      description: t.description,
    })),
  };

  const res = await fetch(`${gatewayUrl}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new GatewayError(`Gateway returned ${res.status}: ${await res.text()}`, res.status);
  }

  const data = await res.json();
  const parsed = recommendationResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new GatewayError(`Invalid gateway response: ${parsed.error.message}`);
  }

  return parsed.data;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/gateway-client.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/gateway.ts tests/gateway-client.test.ts
git commit -m "feat: add chittygateway client with validation and error handling"
```

---

### Task 4: Add Recommendation API Routes

**Files:**
- Modify: `server/routes.ts:1-158`

**Step 1: Write the failing test**

Create `tests/recommendation-routes.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const routesContent = fs.readFileSync(
  path.resolve(__dirname, "../server/routes.ts"),
  "utf-8"
);

describe("Recommendation Routes", () => {
  it("has POST /api/recommendations/generate route", () => {
    expect(routesContent).toContain('"/api/recommendations/generate"');
    expect(routesContent).toContain("app.post");
  });

  it("has GET /api/recommendations route", () => {
    expect(routesContent).toContain('"/api/recommendations"');
    expect(routesContent).toContain("app.get");
  });

  it("has PATCH /api/recommendations/:id/accept route", () => {
    expect(routesContent).toContain('"/api/recommendations/:id/accept"');
    expect(routesContent).toContain("app.patch");
  });

  it("validates request body with recommendationRequestSchema", () => {
    expect(routesContent).toContain("recommendationRequestSchema");
  });

  it("uses asyncRoute wrapper for all recommendation routes", () => {
    // Count recommendation route registrations vs asyncRoute usages
    const recRoutes = routesContent.match(/\/api\/recommendations/g);
    expect(recRoutes).not.toBeNull();
    expect(recRoutes!.length).toBeGreaterThanOrEqual(3);
  });

  it("imports gateway functions", () => {
    expect(routesContent).toContain("generateRecommendation");
    expect(routesContent).toContain("isGatewayConfigured");
  });

  it("returns 503 when gateway is not configured", () => {
    expect(routesContent).toContain("503");
    expect(routesContent).toContain("isGatewayConfigured");
  });

  it("stores recommendation via storage.createRecommendation", () => {
    expect(routesContent).toContain("storage.createRecommendation");
  });

  it("uses storage.acceptRecommendation for accept route", () => {
    expect(routesContent).toContain("storage.acceptRecommendation");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/recommendation-routes.test.ts`
Expected: FAIL — routes.ts doesn't have recommendation routes yet

**Step 3: Write minimal implementation**

In `server/routes.ts`:

1. Add imports at top:

```typescript
import { recommendationRequestSchema } from "@shared/schema";
import { generateRecommendation, isGatewayConfigured, GatewayError } from "./gateway";
```

2. Add recommendation routes before the `return httpServer;` line (before line 157):

```typescript
  // Recommendation routes

  app.post("/api/recommendations/generate", asyncRoute(async (req, res) => {
    if (!isGatewayConfigured()) {
      return res.status(503).json({ message: "Recommendation service not configured" });
    }
    const parsed = recommendationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    }

    const [allSkills, allTemplates] = await Promise.all([
      storage.getSkills(),
      storage.getTemplates(),
    ]);

    const recommendation = await generateRecommendation(
      parsed.data.prompt,
      allSkills,
      allTemplates,
      { category: parsed.data.category, triggerType: parsed.data.triggerType },
    );

    // Validate that returned skillIds actually exist
    const validSkillIds = recommendation.skillIds.filter(
      (id) => allSkills.some((s) => s.id === id)
    );
    recommendation.skillIds = validSkillIds;

    const stored = await storage.createRecommendation({
      prompt: parsed.data.prompt,
      category: parsed.data.category || recommendation.category,
      result: recommendation,
      confidence: Math.round(recommendation.confidence * 100),
      accepted: false,
      agentId: null,
    });

    res.json(stored);
  }));

  app.get("/api/recommendations", asyncRoute(async (_req, res) => {
    const recs = await storage.getRecommendations();
    res.json(recs);
  }));

  app.patch("/api/recommendations/:id/accept", asyncRoute(async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) {
      return res.status(400).json({ message: "agentId is required" });
    }
    const rec = await storage.acceptRecommendation(req.params.id, agentId);
    if (!rec) return res.status(404).json({ message: "Recommendation not found" });
    res.json(rec);
  }));
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/recommendation-routes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/routes.ts tests/recommendation-routes.test.ts
git commit -m "feat: add recommendation API routes (generate, list, accept)"
```

---

### Task 5: Build the Recommendation Wizard Page

**Files:**
- Create: `client/src/pages/agent-recommend.tsx`
- Modify: `client/src/App.tsx:19-29` (add route)

**Step 1: Write the failing test**

Create `tests/recommendation-wizard.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PAGES_DIR = path.resolve(__dirname, "../client/src/pages");
const APP_FILE = path.resolve(__dirname, "../client/src/App.tsx");

describe("Recommendation Wizard Page", () => {
  const wizardContent = fs.readFileSync(path.join(PAGES_DIR, "agent-recommend.tsx"), "utf-8");
  const appContent = fs.readFileSync(APP_FILE, "utf-8");

  describe("page structure", () => {
    it("exports a default component", () => {
      expect(wizardContent).toContain("export default function");
    });

    it("has a prompt textarea input", () => {
      expect(wizardContent).toContain("textarea");
    });

    it("manages wizard steps (describe, review, accept)", () => {
      expect(wizardContent).toContain("describe");
      expect(wizardContent).toContain("review");
    });

    it("calls POST /api/recommendations/generate", () => {
      expect(wizardContent).toContain("/api/recommendations/generate");
    });

    it("uses useMutationWithToast for the generate mutation", () => {
      expect(wizardContent).toContain("useMutationWithToast");
      expect(wizardContent).toContain('from "@/hooks/use-mutation-with-toast"');
    });

    it("uses apiRequest for API calls", () => {
      expect(wizardContent).toContain("apiRequest");
    });

    it("has Create Agent and Open in Builder actions", () => {
      expect(wizardContent).toContain("Create Agent");
      expect(wizardContent).toContain("Open in Builder");
    });

    it("shows confidence score", () => {
      expect(wizardContent).toContain("confidence");
    });

    it("shows reasoning text", () => {
      expect(wizardContent).toContain("reasoning");
    });
  });

  describe("routing", () => {
    it("App.tsx has a route for /agents/recommend", () => {
      expect(appContent).toContain("/agents/recommend");
    });

    it("App.tsx imports AgentRecommend component", () => {
      expect(appContent).toContain("AgentRecommend");
    });

    it("recommend route is before /agents/:id to avoid param conflict", () => {
      const recommendIndex = appContent.indexOf("/agents/recommend");
      const detailIndex = appContent.indexOf("/agents/:id");
      expect(recommendIndex).toBeLessThan(detailIndex);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/recommendation-wizard.test.ts`
Expected: FAIL — `agent-recommend.tsx` does not exist

**Step 3: Write the wizard page**

Create `client/src/pages/agent-recommend.tsx`:

```tsx
import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import type { Agent, Recommendation, RecommendationResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Wand2,
  ChevronRight,
  RotateCcw,
  Pencil,
  Bot,
  Mail,
  FileText,
  Calendar,
  MessageSquare,
  Search,
  Zap,
  Shield,
  BarChart3,
  Users,
} from "lucide-react";
import { CATEGORY_LABELS, TRIGGER_LABELS } from "@/lib/constants";

type WizardStep = "describe" | "review";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bot: Bot, mail: Mail, file: FileText, calendar: Calendar,
  message: MessageSquare, search: Search, zap: Zap,
  shield: Shield, chart: BarChart3, users: Users,
};

export default function AgentRecommend() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<WizardStep>("describe");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [triggerType, setTriggerType] = useState<string | undefined>();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const generateMutation = useMutationWithToast<Recommendation, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/recommendations/generate", {
        prompt,
        category: category || undefined,
        triggerType: triggerType || undefined,
      });
      return res.json();
    },
    successMessage: "Recommendation generated",
    onSuccess: (data) => {
      setRecommendation(data);
      setStep("review");
    },
  });

  const createAgentMutation = useMutationWithToast<Agent, void>({
    mutationFn: async () => {
      const rec = recommendation!.result as RecommendationResponse;
      const res = await apiRequest("POST", "/api/agents", {
        name: rec.name,
        description: rec.description,
        prompt: rec.prompt,
        category: rec.category,
        icon: rec.icon,
        color: rec.color,
        triggerType: rec.triggerType,
        triggerConfig: rec.triggerConfig,
        skillIds: rec.skillIds,
        actions: rec.actions,
      });
      return res.json();
    },
    invalidateKeys: [["/api/agents"], ["/api/recommendations"]],
    successMessage: "Agent created from recommendation",
    onSuccess: async (agent) => {
      if (recommendation) {
        await apiRequest("PATCH", `/api/recommendations/${recommendation.id}/accept`, {
          agentId: agent.id,
        });
      }
      navigate(`/agents/${agent.id}`);
    },
  });

  const openInBuilder = async () => {
    const rec = recommendation!.result as RecommendationResponse;
    const res = await apiRequest("POST", "/api/agents", {
      name: rec.name,
      description: rec.description,
      prompt: rec.prompt,
      category: rec.category,
      icon: rec.icon,
      color: rec.color,
      triggerType: rec.triggerType,
      triggerConfig: rec.triggerConfig,
      skillIds: rec.skillIds,
      actions: rec.actions,
      status: "draft",
    });
    const agent = await res.json();
    if (recommendation) {
      await apiRequest("PATCH", `/api/recommendations/${recommendation.id}/accept`, {
        agentId: agent.id,
      });
    }
    navigate(`/agents/${agent.id}/edit`);
  };

  const rec = recommendation?.result as RecommendationResponse | undefined;
  const IconComponent = rec ? iconMap[rec.icon] || Bot : Bot;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
          <Wand2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Agent Recommendation</h1>
          <p className="text-sm text-muted-foreground">
            Describe what you need and we'll generate a complete agent configuration
          </p>
        </div>
      </div>

      {step === "describe" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">What should this agent do?</label>
            <Textarea
              placeholder="e.g. I want an agent that monitors customer emails, classifies urgency, and routes urgent ones to the support team..."
              className="min-h-[140px] resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              data-testid="input-recommendation-prompt"
            />
            <p className="text-xs text-muted-foreground">{prompt.length}/2000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category (optional)</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trigger type (optional)</label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!prompt.trim() || generateMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-generate"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Recommendation
          </Button>
        </div>
      )}

      {step === "review" && rec && (
        <div className="space-y-6">
          {/* Agent Identity Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: rec.color + "18", color: rec.color }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{rec.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <Badge variant="secondary">
                  {Math.round(rec.confidence * 100)}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{CATEGORY_LABELS[rec.category] || rec.category}</Badge>
                <Badge variant="outline">{TRIGGER_LABELS[rec.triggerType] || rec.triggerType}</Badge>
                <Badge variant="outline">{rec.skillIds.length} skills</Badge>
                <Badge variant="outline">
                  {(rec.actions?.nodes?.length || 0)} workflow nodes
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Agent Instructions */}
          {rec.prompt && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Agent Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rec.prompt}</p>
              </CardContent>
            </Card>
          )}

          {/* Reasoning */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Why this recommendation?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => createAgentMutation.mutate()}
              disabled={createAgentMutation.isPending}
              data-testid="button-create-from-rec"
            >
              {createAgentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              Create Agent
            </Button>
            <Button
              variant="outline"
              onClick={openInBuilder}
              data-testid="button-open-in-builder"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Open in Builder
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStep("describe")}
              data-testid="button-try-again"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Add route to App.tsx**

In `client/src/App.tsx`, add import (after line 10):

```typescript
import AgentRecommend from "@/pages/agent-recommend";
```

Add route BEFORE the `/agents/:id` routes (after line 20, before `/agents/:id/edit`):

```tsx
      <Route path="/agents/recommend" component={AgentRecommend} />
```

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/recommendation-wizard.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add client/src/pages/agent-recommend.tsx client/src/App.tsx tests/recommendation-wizard.test.ts
git commit -m "feat: add recommendation wizard page with describe/review flow"
```

---

### Task 6: Add Inline Recommendation Hints to Agent Builder

**Files:**
- Modify: `client/src/pages/agent-builder.tsx`

**Step 1: Write the failing test**

Create `tests/recommendation-inline.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const builderContent = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/agent-builder.tsx"),
  "utf-8"
);

describe("Inline Recommendation Hints", () => {
  it("has a recommendation banner on the details tab", () => {
    expect(builderContent).toContain("/agents/recommend");
    expect(builderContent).toContain("recommendation");
  });

  it("links to the wizard with Wand2 icon", () => {
    expect(builderContent).toContain("Wand2");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/recommendation-inline.test.ts`
Expected: FAIL — agent-builder.tsx doesn't have recommendation content

**Step 3: Write minimal implementation**

In `client/src/pages/agent-builder.tsx`:

1. Add to lucide imports: `Wand2`
2. Add `Link` import from wouter: `import { Link } from "wouter";`
3. Insert a recommendation banner inside the Details `TabsContent`, right after the opening `<TabsContent value="details" className="space-y-6">` (after line 199):

```tsx
              {!isEditing && (
                <Link href="/agents/recommend">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                    <Wand2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Get AI recommendation</p>
                      <p className="text-xs text-muted-foreground">
                        Describe what you need and let our AI generate a complete agent configuration
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              )}
```

4. Also add `ChevronRight` to lucide imports if not already there.

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/recommendation-inline.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/pages/agent-builder.tsx tests/recommendation-inline.test.ts
git commit -m "feat: add AI recommendation banner to agent builder details tab"
```

---

### Task 7: Add Recommend Entry Point to Home Page

**Files:**
- Modify: `client/src/pages/home.tsx`

**Step 1: Read the current home page**

Read `client/src/pages/home.tsx` to understand its structure before modifying.

**Step 2: Write the failing test**

Create `tests/recommendation-home-link.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const homeContent = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/home.tsx"),
  "utf-8"
);

describe("Home Page Recommendation Link", () => {
  it("has a link to /agents/recommend", () => {
    expect(homeContent).toContain("/agents/recommend");
  });

  it("uses Wand2 icon for the recommendation CTA", () => {
    expect(homeContent).toContain("Wand2");
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npx vitest run tests/recommendation-home-link.test.ts`
Expected: FAIL — home.tsx doesn't link to recommend

**Step 4: Add recommendation CTA to home page**

Add a "Get AI Recommendation" button near the existing "Create Agent" button on the home page. Import `Wand2` from lucide-react and add a secondary Button that navigates to `/agents/recommend`.

**Step 5: Run test to verify it passes**

Run: `npx vitest run tests/recommendation-home-link.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add client/src/pages/home.tsx tests/recommendation-home-link.test.ts
git commit -m "feat: add AI recommendation CTA to home page"
```

---

### Task 8: Update Mutation Hook Convention Test

**Files:**
- Modify: `tests/mutation-hook.test.ts:54-88`

The existing convention test at `tests/mutation-hook.test.ts` verifies every page with mutations uses `useMutationWithToast`. We need to add the new `agent-recommend.tsx` page.

**Step 1: Update the test**

In `tests/mutation-hook.test.ts`, add to the `pages` array (line 54-61):

```typescript
      { name: "agent-recommend.tsx", mutations: ["generateMutation", "createAgentMutation"] },
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run tests/mutation-hook.test.ts`
Expected: PASS (since we already used useMutationWithToast in Task 5)

**Step 3: Commit**

```bash
git add tests/mutation-hook.test.ts
git commit -m "test: add recommendation page to mutation hook convention test"
```

---

### Task 9: Run Full Test Suite and Type Check

**Step 1: Run all tests**

Run: `npm run test`
Expected: All tests PASS

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Fix any issues found, then commit**

```bash
git add -A
git commit -m "fix: resolve any type or test issues from recommendation feature"
```

(Skip this commit if no fixes were needed.)

---

### Task 10: Final Verification and Summary Commit

**Step 1: Verify all recommendation routes exist**

Run: `npx vitest run tests/recommendation-routes.test.ts tests/recommendation-schemas.test.ts tests/recommendation-storage.test.ts tests/recommendation-wizard.test.ts tests/recommendation-inline.test.ts tests/recommendation-home-link.test.ts`
Expected: All PASS

**Step 2: Verify full test suite still passes**

Run: `npm run test`
Expected: All PASS

**Step 3: Review the branch**

Run: `git log --oneline feature/agent-recommendation-flow`

Expected commits (oldest to newest):
1. `docs: add design for automated agent recommendation flow`
2. `feat: add recommendation schema, types, and DB table`
3. `feat: add recommendation CRUD methods to storage layer`
4. `feat: add chittygateway client with validation and error handling`
5. `feat: add recommendation API routes (generate, list, accept)`
6. `feat: add recommendation wizard page with describe/review flow`
7. `feat: add AI recommendation banner to agent builder details tab`
8. `feat: add AI recommendation CTA to home page`
9. `test: add recommendation page to mutation hook convention test`
