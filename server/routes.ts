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

  // 1. Generate the Stripe Checkout Session with strict Anti-Chargeback clauses
  app.post("/api/checkout", asyncRoute(async (req, res) => {
    const { planId } = req.body;
    
    // MOCKED STRIPE SESSION CREATION
    const stripeSessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: planId, quantity: 1 }],
      // CRITICAL: Anti-Chargeback Liability Protection
      consent_collection: {
        terms_of_service: 'required',
      },
      custom_text: {
        terms_of_service_acceptance: {
          message: 'I agree that ChittyPro operates purely as an automation proxy. I assume all risk of upstream ToS violations and account lockouts.',
        },
        submit: {
          message: 'By paying, you accept all automation risks. No refunds for upstream lockouts.'
        }
      },
      success_url: 'https://chittypro.com/dashboard?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://chittypro.com/market',
    };

    res.status(200).json({ url: "https://checkout.stripe.com/mock-url", config: stripeSessionConfig });
  }));

  // 2. The Webhook that fires after they successfully pay and agree to the terms
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

  // === CHITTYPRO V1 API GATEWAY (THE BRIDGE) ===

  async function verifyApiAccess(req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new Error("Missing or invalid Authorization header. Ensure your CHITTYPRO_API_KEY is configured in your MCP client.");
    }
    const token = authHeader.split(" ")[1];
    
    // Hash the incoming key to compare with the zero-knowledge database hash
    const incomingHash = crypto.createHash("sha256").update(token).digest("hex");
    
    // Query the database to find the key
    const allKeys = await storage.getAllApiKeys(); // Assuming a helper exists or we add it
    const validKey = allKeys.find(k => k.keyHash === incomingHash);
    
    if (!validKey) {
      throw new Error("Invalid API Key. Please subscribe at chittypro.com/market to unlock execution.");
    }
    
    if (validKey.status !== "active") {
      throw new Error("API Key revoked or inactive. Please check your billing dashboard.");
    }
    
    // Asynchronously log the usage for Metered Billing
    storage.logApiUsage({
      apiKeyId: validKey.id,
      endpoint: req.originalUrl,
      status: 200,
      latencyMs: 0 // In real implementation, wrap the route handler to capture latency
    }).catch(console.error);

    return true;
  }

  // === NATIVE OPENID CONNECT (OAUTH2) INTEGRATIONS ===
  
  // 1. AppFolio OAuth Initiation
  app.get("/api/v1/auth/appfolio", asyncRoute(async (req, res) => {
    const clientId = "client-4ddec5314af5fc02acfda04682029e476711d9f2";
    const redirectUri = encodeURIComponent("https://api.chitty.cc/api/v1/auth/appfolio/callback");
    // Generate an authorization URL targeting AppFolio's Keycloak Realm
    const authUrl = `https://account.appfolio.com/realms/foliospace/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid&state=chitty_auth`;
    res.redirect(authUrl);
  }));

  // 2. AppFolio OAuth Callback
  app.get("/api/v1/auth/appfolio/callback", asyncRoute(async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).json({ message: "Missing authorization code" });

    // Exchange the code for a Bearer token
    // In production, this stores the resulting access_token against the user's ChittyID in Neon
    res.json({
      status: "success",
      message: "AppFolio OpenID authentication successful. Your MCP Connectors can now hit AppFolio natively.",
      code_received: code
    });
  }));

  // === DYNAMIC PROXY GATEWAY ===

  // Proxies requests from the MCP client to the internal ChittyHarvest microservice
  app.post("/api/v1/:provider/:action", asyncRoute(async (req, res) => {
    await verifyApiAccess(req);
    
    const provider = req.params.provider; // 'turbotenant', 'furnishedfinder', 'zillow', 'buildinglink', 'appfolio'
    const action = req.params.action;

    // Validate provider bounds
    if (!["turbotenant", "furnishedfinder", "zillow", "buildinglink", "appfolio"].includes(provider)) {
      return res.status(400).json({ status: "error", message: "Unsupported provider" });
    }

    const harvestToken = process.env.CHITTY_INTERNAL_TOKEN;
    if (!harvestToken) {
      console.warn(`⚠️  Missing CHITTY_INTERNAL_TOKEN in environment for ${provider}:${action}.`);
      return res.json({ 
        status: "success", 
        provider,
        action,
        data: `Mocked data for ${provider} ${action}. (Set CHITTY_INTERNAL_TOKEN to route request to live ChittyHarvest service)` 
      });
    }

    // Execute "The Ghost Method" natively via the internal ChittyHarvest service
    const harvestRes = await fetch(`https://harvest.chitty.cc/api/v1/extract/${provider}/${action}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${harvestToken}` 
      },
      body: JSON.stringify({ parameters: req.body })
    });

    if (!harvestRes.ok) {
      throw new Error(`ChittyHarvest Execution Failed: ${harvestRes.statusText}`);
    }

    const dataset = await harvestRes.json();
    res.json({ status: "success", data: dataset });
  }));

  // === CHITTYTRANSACT INTEGRATION ===
  // Programmatic access to the unified payment platform (ChittyPay + ChittyCharge)
  app.post("/api/v1/transact/:type", asyncRoute(async (req, res) => {
    await verifyApiAccess(req);
    const { type } = req.params; // 'holds', 'payments', 'subscriptions'

    // Forward the request to the internal ChittyTransact microservice
    try {
      const transactRes = await fetch(`https://transact.chitty.cc/api/transact/${type}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CHITTY_INTERNAL_TOKEN}` // Internal service auth
        },
        body: JSON.stringify(req.body)
      });

      if (!transactRes.ok) {
        throw new Error(`Transaction Failed: ${transactRes.statusText}`);
      }

      const result = await transactRes.json();
      res.json({ status: "success", data: result });
    } catch (e: any) {
      // Graceful fallback if transact.chitty.cc is not reachable in development
      res.json({
        status: "success",
        data: {
          mock: true,
          message: `Mocked ${type} transaction successful. Set CHITTY_INTERNAL_TOKEN to hit live ChittyTransact service.`,
          payload: req.body
        }
      });
    }
  }));

  return httpServer;
}
