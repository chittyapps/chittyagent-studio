import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  prompt: z.string().max(5000).default(""),
  icon: z.string().default("bot"),
  color: z.string().default("#4285f4"),
  status: z.string().default("draft"),
  triggerType: z.string().default("manual"),
  triggerConfig: z.record(z.unknown()).default({}),
  actions: z.array(z.unknown()).default([]),
  category: z.string().default("general"),
});

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  prompt: z.string().max(5000).optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(["draft", "active", "paused"]).optional(),
  triggerType: z.string().optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.array(z.unknown()).optional(),
  category: z.string().optional(),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/agents", async (_req, res) => {
    try {
      const agents = await storage.getAgents();
      res.json(agents);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      res.json(agent);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const parsed = createAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
      }
      const data = parsed.data;
      const agent = await storage.createAgent({
        ...data,
        isTemplate: false,
      });
      res.status(201).json(agent);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const parsed = updateAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.issues.map(i => i.message).join(", ") });
      }
      const agent = await storage.updateAgent(req.params.id, parsed.data);
      if (!agent) return res.status(404).json({ message: "Agent not found" });
      res.json(agent);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAgent(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Agent not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/agents/:id/run", async (req, res) => {
    try {
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
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/agents/:id/runs", async (req, res) => {
    try {
      const runs = await storage.getAgentRuns(req.params.id);
      res.json(runs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/templates", async (_req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/templates/:id/use", async (req, res) => {
    try {
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
        isTemplate: false,
      });
      res.status(201).json(agent);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}
