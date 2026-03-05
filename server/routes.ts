import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { syncGithubRepos } from "./seed";
import { createAgentSchema, updateAgentSchema, recommendationRequestSchema } from "@shared/schema";
import { generateRecommendation, isGatewayConfigured, GatewayError } from "./gateway";
import { executeAgent } from "./executor";
import { handleEmbedChat, generateWidgetScript, checkRateLimit, validateMessages } from "./embed";

function buildSystemPrompt(agent: any, skills: any[], workflowNodes: any[]): string {
  const parts: string[] = [];

  parts.push(`You are "${agent.name}" - ${agent.description}`);

  if (agent.prompt) {
    parts.push(`\n## Instructions\n${agent.prompt}`);
  }

  if (workflowNodes.length > 0) {
    parts.push(`\n## Workflow Steps`);
    workflowNodes.forEach((node: any, i: number) => {
      const label = node.data?.label || node.type;
      const prompt = node.data?.prompt || "";
      parts.push(`${i + 1}. [${node.type}] ${label}${prompt ? `: ${prompt}` : ""}`);
    });
  }

  if (skills.length > 0) {
    parts.push(`\n## Available Skills`);
    skills.forEach((skill: any) => {
      const caps = skill.capabilities?.length ? ` (${skill.capabilities.join(", ")})` : "";
      parts.push(`- ${skill.name}: ${skill.description}${caps}`);
    });
  }

  parts.push(`\n## Behavior\n- Category: ${agent.category}\n- Trigger: ${agent.triggerType}\n- Source: ChittyAgent Studio (chitty.cc/os)`);

  return parts.join("\n");
}

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
      totalSteps: 1,
    });

    await storage.incrementRunCount(agent.id);

    executeAgent(run.id, agent).catch(async (err) => {
      console.error("Agent execution failed:", err);
      try {
        await storage.updateAgentRun(run.id, {
          status: "failed",
          result: `Execution error: ${err.message}`,
          completedAt: new Date(),
        });
      } catch (e) {
        console.error("Failed to update run after error:", e);
      }
    });

    res.json(run);
  }));

  app.get("/api/agents/:id/runs", asyncRoute(async (req, res) => {
    const runs = await storage.getAgentRuns(req.params.id);
    res.json(runs);
  }));

  app.get("/api/agents/:id/export/:format", asyncRoute(async (req, res) => {
    const agent = await storage.getAgent(req.params.id);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const attachedSkills = [];
    if (agent.skillIds && agent.skillIds.length > 0) {
      for (const sid of agent.skillIds) {
        const skill = await storage.getSkill(sid);
        if (skill) attachedSkills.push(skill);
      }
    }

    const workflowNodes = (agent.actions as any)?.nodes || [];
    const format = req.params.format;

    if (format === "chatgpt") {
      const toolDefs = attachedSkills.map(s => ({
        type: "function" as const,
        function: {
          name: s.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
          description: s.description,
          parameters: { type: "object", properties: {}, required: [] },
        },
      }));

      const systemPrompt = buildSystemPrompt(agent, attachedSkills, workflowNodes);

      const exportData = {
        platform: "openai",
        format_version: "1.0",
        model: "gpt-4o",
        name: agent.name,
        description: agent.description,
        instructions: systemPrompt,
        tools: toolDefs,
        conversation_starters: [
          `Run the ${agent.name} workflow`,
          `What can this agent do?`,
        ],
      };
      res.json(exportData);

    } else if (format === "claude") {
      const systemPrompt = buildSystemPrompt(agent, attachedSkills, workflowNodes);

      const toolDefs = attachedSkills.map(s => ({
        name: s.name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
        description: s.description,
        input_schema: { type: "object", properties: {}, required: [] },
      }));

      const exportData = {
        platform: "anthropic",
        format_version: "1.0",
        model: "claude-sonnet-4-20250514",
        name: agent.name,
        description: agent.description,
        system: systemPrompt,
        tools: toolDefs,
        metadata: {
          category: agent.category,
          trigger: agent.triggerType,
          source: "ChittyAgent Studio",
        },
      };
      res.json(exportData);

    } else if (format === "api") {
      const systemPrompt = buildSystemPrompt(agent, attachedSkills, workflowNodes);

      const exportData = {
        platform: "generic",
        format_version: "1.0",
        agent: {
          name: agent.name,
          description: agent.description,
          category: agent.category,
          trigger: agent.triggerType,
        },
        system_prompt: systemPrompt,
        skills: attachedSkills.map(s => ({
          name: s.name,
          description: s.description,
          category: s.category,
          capabilities: s.capabilities,
        })),
        workflow: {
          nodes: workflowNodes.map((n: any) => ({
            id: n.id,
            type: n.type,
            label: n.data?.label || n.type,
            config: n.data || {},
          })),
          edges: (agent.actions as any)?.edges || [],
        },
        metadata: {
          exported_at: new Date().toISOString(),
          source: "ChittyAgent Studio",
          source_url: "https://chitty.cc/os",
        },
      };
      res.json(exportData);

    } else {
      res.status(400).json({ message: "Invalid format. Use: chatgpt, claude, or api" });
    }
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

  // Connection routes

  app.get("/api/connections", asyncRoute(async (_req, res) => {
    const conns = await storage.getConnections();
    res.json(conns);
  }));

  app.post("/api/connections", asyncRoute(async (req, res) => {
    const conn = await storage.createConnection(req.body);
    res.status(201).json(conn);
  }));

  app.patch("/api/connections/:id", asyncRoute(async (req, res) => {
    const conn = await storage.updateConnection(req.params.id, req.body);
    if (!conn) return res.status(404).json({ message: "Connection not found" });
    res.json(conn);
  }));

  app.delete("/api/connections/:id", asyncRoute(async (req, res) => {
    const deleted = await storage.deleteConnection(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Connection not found" });
    res.json({ success: true });
  }));

  app.post("/api/connections/:id/test", asyncRoute(async (req, res) => {
    const conn = await storage.getConnection(req.params.id);
    if (!conn) return res.status(404).json({ message: "Connection not found" });

    let testResult = { success: false, message: "Unknown connection type" };

    if (conn.provider === "openai" || conn.provider === "replit-ai") {
      try {
        const OpenAI = (await import("openai")).default;
        const client = new OpenAI({
          apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });
        const response = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: "Say 'connected' in one word." }],
          max_tokens: 10,
        });
        testResult = {
          success: true,
          message: `AI connected: ${response.choices[0]?.message?.content || "ok"}`,
        };
      } catch (e: any) {
        testResult = { success: false, message: e.message };
      }
    } else if (conn.provider === "github") {
      testResult = {
        success: !!process.env.GITHUB_TOKEN,
        message: process.env.GITHUB_TOKEN ? "GitHub token configured" : "No GitHub token found",
      };
    } else if (conn.provider === "webhook") {
      testResult = { success: true, message: "Webhook endpoint ready to receive" };
    } else if (conn.provider === "email") {
      testResult = { success: true, message: "Email service configured (simulation mode)" };
    }

    if (testResult.success) {
      await storage.updateConnection(conn.id, { status: "connected" });
    } else {
      await storage.updateConnection(conn.id, { status: "error" });
    }

    res.json(testResult);
  }));

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

    let recommendation;
    try {
      recommendation = await generateRecommendation(
        parsed.data.prompt,
        allSkills,
        allTemplates,
        { category: parsed.data.category, triggerType: parsed.data.triggerType },
      );
    } catch (err) {
      if (err instanceof GatewayError) {
        return res.status(err.statusCode || 502).json({ message: err.message });
      }
      throw err;
    }

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

  app.post("/api/embed/:agentId/chat", asyncRoute(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (!checkRateLimit(req.params.agentId)) {
      return res.status(429).json({ message: "Rate limit exceeded. Try again in a minute." });
    }

    const validated = validateMessages(req.body?.messages);
    if (!validated) {
      return res.status(400).json({ message: "Valid messages array with role and content is required" });
    }

    const reply = await handleEmbedChat(req.params.agentId, validated);
    res.json({ reply });
  }));

  app.options("/api/embed/:agentId/chat", (_req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
  });

  app.get("/api/embed/:agentId/info", asyncRoute(async (req, res) => {
    const agent = await storage.getAgent(req.params.agentId);
    if (!agent) return res.status(404).json({ message: "Agent not found" });
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      color: agent.color,
      category: agent.category,
    });
  }));

  app.get("/embed/widget.js", (_req, res) => {
    const protocol = _req.headers["x-forwarded-proto"] || _req.protocol;
    const host = _req.headers["x-forwarded-host"] || _req.headers.host;
    const baseUrl = `${protocol}://${host}`;
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(generateWidgetScript(baseUrl));
  });

  return httpServer;
}
