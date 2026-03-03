import { Hono } from "hono";
import { createDb } from "./db";
import { DatabaseStorage } from "./storage";
import { createAgentSchema, updateAgentSchema } from "@shared/schema";

type Bindings = { DATABASE_URL: string };

export function registerRoutes(app: Hono<{ Bindings: Bindings }>) {
  // --- Agents ---

  app.get("/api/agents", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const agents = await store.getAgents();
    return c.json(agents);
  });

  app.get("/api/agents/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const agent = await store.getAgent(c.req.param("id"));
    if (!agent) return c.json({ error: "Agent not found" }, 404);
    return c.json(agent);
  });

  app.post("/api/agents", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const body = await c.req.json();
    const parsed = createAgentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400
      );
    }
    const agent = await store.createAgent({
      ...parsed.data,
      isTemplate: false,
    });
    return c.json(agent, 201);
  });

  app.patch("/api/agents/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const body = await c.req.json();
    const parsed = updateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: parsed.error.issues.map((i) => i.message).join(", ") },
        400
      );
    }
    const agent = await store.updateAgent(c.req.param("id"), parsed.data);
    if (!agent) return c.json({ error: "Agent not found" }, 404);
    return c.json(agent);
  });

  app.delete("/api/agents/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const deleted = await store.deleteAgent(c.req.param("id"));
    if (!deleted) return c.json({ error: "Agent not found" }, 404);
    return c.json({ success: true });
  });

  app.post("/api/agents/:id/run", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const agent = await store.getAgent(c.req.param("id"));
    if (!agent) return c.json({ error: "Agent not found" }, 404);

    const run = await store.createAgentRun({
      agentId: agent.id,
      status: "running",
      triggerInfo: "Manual trigger",
      stepsCompleted: 0,
      totalSteps: 3,
    });

    await store.incrementRunCount(agent.id);

    // In Workers we cannot use setTimeout for background work.
    // Mark the run as completed synchronously for now.
    await store.updateAgentRun(run.id, {
      status: "completed",
      result: `Successfully completed: ${agent.name} processed 3 steps.`,
      stepsCompleted: 3,
      completedAt: new Date(),
    });

    return c.json(run);
  });

  app.get("/api/agents/:id/runs", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const runs = await store.getAgentRuns(c.req.param("id"));
    return c.json(runs);
  });

  // --- Templates ---

  app.get("/api/templates", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const templates = await store.getTemplates();
    return c.json(templates);
  });

  app.get("/api/templates/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const template = await store.getTemplate(c.req.param("id"));
    if (!template) return c.json({ error: "Template not found" }, 404);
    return c.json(template);
  });

  app.post("/api/templates/:id/use", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const template = await store.getTemplate(c.req.param("id"));
    if (!template) return c.json({ error: "Template not found" }, 404);

    const agent = await store.createAgent({
      name: template.name,
      description: template.description,
      prompt: template.prompt,
      icon: template.icon,
      color: template.color,
      status: "draft",
      triggerType: template.triggerType,
      triggerConfig: (template.triggerConfig as Record<string, unknown>) || {},
      actions: (template.actions as any[]) || [],
      category: template.category,
      skillIds: template.skillIds || [],
      isTemplate: false,
    });
    return c.json(agent, 201);
  });

  // --- Skills ---

  app.get("/api/skills", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const allSkills = await store.getSkills();
    return c.json(allSkills);
  });

  app.get("/api/skills/:id", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const skill = await store.getSkill(c.req.param("id"));
    if (!skill) return c.json({ error: "Skill not found" }, 404);
    return c.json(skill);
  });

  app.post("/api/skills/:id/install", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const skill = await store.getSkill(c.req.param("id"));
    if (!skill) return c.json({ error: "Skill not found" }, 404);
    await store.incrementSkillInstall(c.req.param("id"));
    return c.json({ success: true });
  });

  // --- GitHub Repos ---

  app.get("/api/github/repos", async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const store = new DatabaseStorage(db);
    const repos = await store.getGithubRepos();
    return c.json(repos);
  });
}
