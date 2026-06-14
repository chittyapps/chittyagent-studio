import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { syncGithubRepos } from "./seed";
import { createAgentSchema, updateAgentSchema } from "@shared/schema";
import { provisionNeonDatabase } from "./neon";

function asyncRoute(handler: (req: any, res: any) => Promise<any>) {
  return async (req: any, res: any) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/agents", asyncRoute(async (_req, res) => {
    const agents = await storage.getAgents();
    res.json(agents);
  }));

  app.get("/api/agents/:id", asyncRoute(async (req, res) => {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  }));

  app.post("/api/agents", asyncRoute(async (req, res) => {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    }
    const agent = await storage.createAgent({
      ...parsed.data,
      isTemplate: false,
    });
    res.status(201).json(agent);
  }));

  app.patch("/api/agents/:id", asyncRoute(async (req, res) => {
    const parsed = updateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
    }
    const agent = await storage.updateAgent(req.params.id, parsed.data);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.json(agent);
  }));

  app.delete("/api/agents/:id", asyncRoute(async (req, res) => {
    const deleted = await storage.deleteAgent(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Agent not found" });
    res.json({ success: true });
  }));

  app.post("/api/agents/:id/run", asyncRoute(async (req, res) => {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const run = await storage.createAgentRun({
      agentId: agent.id,
      status: "running",
      triggerInfo: "Manual trigger",
      stepsCompleted: 0,
      totalSteps: 3,
    });

    await storage.incrementRunCount(agent.id);

    setTimeout(async () => {
      try {
        await storage.updateAgentRun(run.id, {
          status: "completed",
          result: `Successfully completed: ${agent.name} processed 3 steps.`,
          stepsCompleted: 3,
          completedAt: new Date(),
        });
      } catch (e) {
        console.error("Failed to update run:", e);
      }
    }, 2000);

    res.json(run);
  }));

  app.get("/api/agents/:id/runs", asyncRoute(async (req, res) => {
    const runs = await storage.getAgentRuns(req.params.id);
    res.json(runs);
  }));

  app.get("/api/templates", asyncRoute(async (_req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  }));

  app.get("/api/templates/:id", asyncRoute(async (req, res) => {
    const template = await storage.getTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  }));

  app.post("/api/templates/:id/use", asyncRoute(async (req, res) => {
    const template = await storage.getTemplate(req.params.id);
    if (!template) return res.status(404).json({ message: "Template not found" });

    const agent = await storage.createAgent({
      name: template.name,
      description: template.description,
      prompt: template.prompt,
      icon: template.icon,
      color: template.color,
      status: "draft",
      triggerType: template.triggerType,
      triggerConfig: template.triggerConfig as Record<string, unknown> || {},
      actions: template.actions as any[] || [],
      category: template.category,
      skillIds: template.skillIds || [],
      isTemplate: false,
    });
    res.status(201).json(agent);
  }));

  app.get("/api/skills", asyncRoute(async (_req, res) => {
    const allSkills = await storage.getSkills();
    res.json(allSkills);
  }));

  app.get("/api/skills/:id", asyncRoute(async (req, res) => {
    const skill = await storage.getSkill(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });
    res.json(skill);
  }));

  app.post("/api/skills/:id/install", asyncRoute(async (req, res) => {
    const skill = await storage.getSkill(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });
    await storage.incrementSkillInstall(req.params.id);
    res.json({ success: true });
  }));

  app.get("/api/github/repos", asyncRoute(async (_req, res) => {
    const repos = await storage.getGithubRepos();
    res.json(repos);
  }));

  app.post("/api/github/sync", asyncRoute(async (_req, res) => {
    await syncGithubRepos();
    const repos = await storage.getGithubRepos();
    res.json({ success: true, count: repos.length });
  }));

  // === CHITTYPRO MARKETPLACE ROUTES ===

  // Note: Hardcoded development user ID. In production, extract from JWT/session.
  const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";

  app.get("/api/keys", asyncRoute(async (_req, res) => {
    const keys = await storage.getApiKeys(DEV_USER_ID);
    res.json(keys);
  }));

  app.post("/api/keys", asyncRoute(async (_req, res) => {
    // 1. Generate secure API Key
    const rawKey = `chitty_live_${crypto.randomBytes(24).toString("hex")}`;
    const prefix = rawKey.substring(0, 16) + "...";
    
    // 2. Hash it before storing to database (zero-knowledge architecture)
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await storage.createApiKey({
      userId: DEV_USER_ID,
      keyHash,
      prefix,
      status: "active",
    });

    // 3. We ONLY return the raw key on creation!
    res.status(201).json({ ...apiKey, rawKey });
  }));

  app.get("/api/subscriptions", asyncRoute(async (_req, res) => {
    const subs = await storage.getSubscriptions(DEV_USER_ID);
    res.json(subs);
  }));

  app.post("/api/subscriptions", asyncRoute(async (req, res) => {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ message: "planId is required" });

    // Note: In reality, this route is hit by the Stripe Webhook 
    // after a checkout.session.completed event!
    const subscription = await storage.createSubscription({
      userId: DEV_USER_ID,
      planId,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    });

    // Automatically provision a scale-to-zero Neon database for this tenant!
    let dbCredentials = null;
    try {
      dbCredentials = await provisionNeonDatabase(DEV_USER_ID);
    } catch (err) {
      console.error("Non-fatal: Failed to provision Neon DB", err);
    }
    
    res.status(201).json({
      subscription,
      database: dbCredentials
    });
  }));

  return httpServer;
}
