import { type AppDb } from "./db";
import { agents, skills, githubRepos } from "@shared/schema";
import { eq } from "drizzle-orm";

const templateData = [
  {
    name: "Email Triage Assistant",
    description: "Automatically categorize incoming emails by priority and topic, flag urgent items, and draft quick replies for common inquiries.",
    prompt: "When an email arrives in my inbox, analyze the content and sender. Categorize it as urgent, important, or low priority. For support emails, draft a polite acknowledgment. For meeting requests, check my calendar availability. Flag anything from VIP contacts.",
    icon: "mail",
    color: "#4285f4",
    triggerType: "email",
    category: "email",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Meeting Notes Summarizer",
    description: "After every meeting, generate concise summaries with action items, key decisions, and follow-up tasks assigned to participants.",
    prompt: "After each meeting ends, create a structured summary including: attendees, key discussion points, decisions made, and action items with owners and deadlines. Send the summary to all participants via email and save it to the shared Drive folder.",
    icon: "calendar",
    color: "#34a853",
    triggerType: "event",
    category: "productivity",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Weekly Status Reporter",
    description: "Compile project updates from team members across Sheets and Docs into a formatted weekly status report every Friday.",
    prompt: "Every Friday at 3 PM, collect updates from the project tracking sheet, recent document changes, and email threads. Compile into a clean status report with sections for each team. Highlight blockers and at-risk deliverables. Send to leadership group.",
    icon: "chart",
    color: "#fbbc04",
    triggerType: "schedule",
    category: "productivity",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Customer Support Router",
    description: "Analyze support tickets, detect sentiment and urgency, then route to the right team member with context and suggested responses.",
    prompt: "When a new support ticket arrives, analyze the content for sentiment, urgency, and topic category. Route technical issues to engineering, billing questions to finance, and feature requests to product. Include a suggested response draft and relevant knowledge base articles.",
    icon: "message",
    color: "#ea4335",
    triggerType: "email",
    category: "support",
    isTemplate: true,
    status: "active",
  },
  {
    name: "HR Onboarding Coordinator",
    description: "Automate new hire onboarding by sending welcome emails, creating accounts, assigning training, and scheduling orientation meetings.",
    prompt: "When a new employee is added to the HR sheet, send a personalized welcome email with first-day instructions. Create a checklist doc from the onboarding template. Schedule orientation meetings with their manager and buddy. Set up access requests for required tools.",
    icon: "users",
    color: "#8b5cf6",
    triggerType: "event",
    category: "hr",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Sales Lead Qualifier",
    description: "Score and qualify inbound leads based on company size, industry, engagement signals, and buying intent indicators.",
    prompt: "When a new lead form submission arrives, research the company online. Score the lead based on company size, industry fit, and engagement history. If score is above threshold, create a briefing doc and notify the assigned sales rep. Add to the pipeline tracker sheet.",
    icon: "zap",
    color: "#f97316",
    triggerType: "webhook",
    category: "sales",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Document Review Agent",
    description: "Review documents for compliance, formatting standards, and completeness. Flag issues and suggest corrections automatically.",
    prompt: "When a document is shared for review, check for compliance with company standards: proper formatting, required sections present, no placeholder text, correct branding. Generate a review checklist with findings and suggestions. Add comments directly in the document.",
    icon: "file",
    color: "#06b6d4",
    triggerType: "event",
    category: "productivity",
    isTemplate: true,
    status: "active",
  },
  {
    name: "Security Alert Monitor",
    description: "Monitor security alerts and access logs, identify anomalies, and notify the security team with incident analysis and recommended actions.",
    prompt: "Continuously monitor access logs and security alerts. When unusual activity is detected (failed login attempts, access from new locations, privilege escalation), analyze the context and severity. Create an incident report and alert the security team via Chat with recommended immediate actions.",
    icon: "shield",
    color: "#ec4899",
    triggerType: "schedule",
    category: "data",
    isTemplate: true,
    status: "active",
  },
];

interface SkillMapping {
  repoName: string;
  icon: string;
  color: string;
  category: string;
  capabilities: string[];
}

const skillMappings: Record<string, SkillMapping> = {
  chittyscore: {
    repoName: "chittyscore",
    icon: "shield",
    color: "#4285f4",
    category: "trust",
    capabilities: ["Trust scoring", "Behavioral analysis", "6D evaluation", "Risk assessment"],
  },
  chittyverify: {
    repoName: "chittyverify",
    icon: "shield",
    color: "#34a853",
    category: "verification",
    capabilities: ["Document verification", "Identity checks", "Compliance validation", "KYC/KYB"],
  },
  chittyintel: {
    repoName: "chittyintel",
    icon: "search",
    color: "#8b5cf6",
    category: "intelligence",
    capabilities: ["Fact extraction", "Contradiction detection", "Timeline construction", "Case analysis"],
  },
  chittybeacon: {
    repoName: "chittybeacon",
    icon: "zap",
    color: "#f97316",
    category: "monitoring",
    capabilities: ["Service discovery", "Health checks", "Uptime monitoring", "Alert routing"],
  },
  chittymonitor: {
    repoName: "chittymonitor",
    icon: "chart",
    color: "#ea4335",
    category: "monitoring",
    capabilities: ["Performance tracking", "Real-time metrics", "Anomaly detection", "System health"],
  },
  chittyledger: {
    repoName: "chittyledger",
    icon: "file",
    color: "#06b6d4",
    category: "data",
    capabilities: ["Transaction tracking", "Audit trails", "Reconciliation", "Ledger management"],
  },
  chittychronicle: {
    repoName: "chittychronicle",
    icon: "calendar",
    color: "#ec4899",
    category: "legal",
    capabilities: ["Timeline management", "Evidence tracking", "Litigation support", "Case management"],
  },
  chittyscrape: {
    repoName: "chittyscrape",
    icon: "search",
    color: "#fbbc04",
    category: "automation",
    capabilities: ["Web scraping", "Data extraction", "Browser automation", "Content monitoring"],
  },
  chittymcp: {
    repoName: "chittymcp",
    icon: "bot",
    color: "#4285f4",
    category: "ai",
    capabilities: ["MCP server", "Multi-tenant", "OAuth", "44+ tools", "Rate limiting"],
  },
  chittyrouter: {
    repoName: "chittyrouter",
    icon: "zap",
    color: "#8b5cf6",
    category: "ai",
    capabilities: ["AI routing", "Multi-model gateway", "Model selection", "Load balancing"],
  },
  chittyconnect: {
    repoName: "chittyconnect",
    icon: "users",
    color: "#34a853",
    category: "utility",
    capabilities: ["Context management", "Session tracking", "State inheritance", "Materialization"],
  },
  chittyassets: {
    repoName: "chittyassets",
    icon: "file",
    color: "#f97316",
    category: "data",
    capabilities: ["Asset management", "Blockchain integration", "Ownership proof", "Dashboard filtering"],
  },
  chittyconcierge: {
    repoName: "chittyconcierge",
    icon: "message",
    color: "#06b6d4",
    category: "communication",
    capabilities: ["Communication orchestration", "Multi-channel", "Notification management", "AI responses"],
  },
  chittytrack: {
    repoName: "chittytrack",
    icon: "chart",
    color: "#ea4335",
    category: "monitoring",
    capabilities: ["Log aggregation", "Metrics collection", "Distributed tracing", "Observability"],
  },
  chittycore: {
    repoName: "chittycore",
    icon: "puzzle",
    color: "#4285f4",
    category: "utility",
    capabilities: ["Foundation package", "ID management", "Auth", "Beacon tracking", "Registry"],
  },
  chittycommand: {
    repoName: "chittycommand",
    icon: "zap",
    color: "#8b5cf6",
    category: "utility",
    capabilities: ["Life management", "Action dashboard", "Task orchestration"],
  },
  chittycan: {
    repoName: "chittycan",
    icon: "shield",
    color: "#34a853",
    category: "automation",
    capabilities: ["Autonomous network", "Natural language commands", "DNA vaults"],
  },
  chittyregistry: {
    repoName: "chittyregistry",
    icon: "puzzle",
    color: "#06b6d4",
    category: "utility",
    capabilities: ["Tool registry", "Script registry", "Package management"],
  },
  chittygateway: {
    repoName: "chittygateway",
    icon: "zap",
    color: "#f97316",
    category: "utility",
    capabilities: ["API gateway", "Cloudflare Worker", "Service consolidation"],
  },
  "chittyagent-local": {
    repoName: "chittyagent-local",
    icon: "bot",
    color: "#ec4899",
    category: "automation",
    capabilities: ["Local agents", "macOS automation", "System tasks"],
  },
  "chittyagent-cleaner": {
    repoName: "chittyagent-cleaner",
    icon: "bot",
    color: "#ea4335",
    category: "automation",
    capabilities: ["Disk cleanup", "Storage management", "Automated maintenance"],
  },
  chittycleaner: {
    repoName: "chittycleaner",
    icon: "file",
    color: "#fbbc04",
    category: "automation",
    capabilities: ["Storage management", "File organization", "Google Drive sync", "Monitoring"],
  },
  "chitty-issue-resolver": {
    repoName: "chitty-issue-resolver",
    icon: "message",
    color: "#4285f4",
    category: "automation",
    capabilities: ["Issue resolution", "Automated triage", "ChitCommit integration"],
  },
  "chittyos-cli": {
    repoName: "chittyos-cli",
    icon: "zap",
    color: "#34a853",
    category: "utility",
    capabilities: ["CLI interface", "AI intelligence", "System integration"],
  },
  sessionsync: {
    repoName: "sessionsync",
    icon: "users",
    color: "#8b5cf6",
    category: "ai",
    capabilities: ["Cross-session coordination", "Self-evolving AI", "Session sync"],
  },
  "get-chitty": {
    repoName: "get-chitty",
    icon: "bot",
    color: "#06b6d4",
    category: "ai",
    capabilities: ["Multi-model AI gateway", "API routing", "Model management"],
  },
  chittycontext: {
    repoName: "chittycontext",
    icon: "users",
    color: "#f97316",
    category: "utility",
    capabilities: ["Context management", "State tracking"],
  },
  chittysync: {
    repoName: "chittysync",
    icon: "zap",
    color: "#4285f4",
    category: "utility",
    capabilities: ["Data synchronization", "Cross-service sync"],
  },
  chittyhelper: {
    repoName: "chittyhelper",
    icon: "puzzle",
    color: "#ea4335",
    category: "utility",
    capabilities: ["Helper utilities", "System tools"],
  },
  chittyid: {
    repoName: "chittyid",
    icon: "shield",
    color: "#4285f4",
    category: "trust",
    capabilities: ["Identity management", "User identity", "Auth tokens"],
  },
  chittychain: {
    repoName: "chittychain",
    icon: "shield",
    color: "#8b5cf6",
    category: "data",
    capabilities: ["Blockchain", "Distributed ledger", "Foundation chain"],
  },
  "chitty-ops-foundation": {
    repoName: "chitty-ops-foundation",
    icon: "zap",
    color: "#34a853",
    category: "utility",
    capabilities: ["Infrastructure", "Terminal operations", "Hookification"],
  },
  chittyfinance: {
    repoName: "chittyfinance",
    icon: "chart",
    color: "#34a853",
    category: "data",
    capabilities: ["Financial operations", "AI-powered CFO", "Automated finance"],
  },
  chittydlvr: {
    repoName: "chittydlvr",
    icon: "file",
    color: "#f97316",
    category: "verification",
    capabilities: ["Certified delivery", "Proof of delivery", "Chain of custody"],
  },
  documint: {
    repoName: "documint",
    icon: "file",
    color: "#06b6d4",
    category: "legal",
    capabilities: ["Document signing", "ChittyProof", "11-pillar proof", "Permanent records"],
  },
  "chittyauth-app": {
    repoName: "chittyauth-app",
    icon: "shield",
    color: "#ea4335",
    category: "trust",
    capabilities: ["Authentication", "Token provisioning", "OAuth"],
  },
  chittytrace: {
    repoName: "chittytrace",
    icon: "search",
    color: "#ec4899",
    category: "legal",
    capabilities: ["Evidence tracking", "Litigation support", "Document processing"],
  },
  chittyreception: {
    repoName: "chittyreception",
    icon: "users",
    color: "#4285f4",
    category: "communication",
    capabilities: ["Reception management", "Visitor tracking"],
  },
  chittylanding: {
    repoName: "chittylanding",
    icon: "puzzle",
    color: "#8b5cf6",
    category: "utility",
    capabilities: ["Landing page", "Web3 business OS"],
  },
  chittyinsight: {
    repoName: "chittyinsight",
    icon: "search",
    color: "#34a853",
    category: "intelligence",
    capabilities: ["Business insights", "Data analysis"],
  },
  chittyformfill: {
    repoName: "chittyformfill",
    icon: "file",
    color: "#fbbc04",
    category: "automation",
    capabilities: ["PDF form engine", "Form extraction", "AI form filling", "Claude/OpenAI"],
  },
  chittyforge: {
    repoName: "chittyforge",
    icon: "zap",
    color: "#06b6d4",
    category: "utility",
    capabilities: ["Development tools", "Deployment", "ChittyApps ecosystem"],
  },
  "chittycloude-mcp": {
    repoName: "chittycloude-mcp",
    icon: "bot",
    color: "#8b5cf6",
    category: "ai",
    capabilities: ["Cloud deployment", "Cloudflare", "Vercel", "MCP extension"],
  },
  chittychat: {
    repoName: "chittychat",
    icon: "message",
    color: "#4285f4",
    category: "communication",
    capabilities: ["Chat platform", "Real-time messaging"],
  },
  chittycharge: {
    repoName: "chittycharge",
    icon: "zap",
    color: "#f97316",
    category: "data",
    capabilities: ["Authorization holds", "ChittyPay", "Payment processing"],
  },
  ch1tty: {
    repoName: "ch1tty",
    icon: "bot",
    color: "#ec4899",
    category: "ai",
    capabilities: ["AI assistant", "Core agent"],
  },
  chittyproof: {
    repoName: "chittyproof",
    icon: "shield",
    color: "#34a853",
    category: "verification",
    capabilities: ["Proof generation", "Evidence verification", "Chain of proof"],
  },
  chico: {
    repoName: "chico",
    icon: "bot",
    color: "#06b6d4",
    category: "ai",
    capabilities: ["AI companion", "Project assistant"],
  },
  "chittyagent-studio": {
    repoName: "chittyagent-studio",
    icon: "bot",
    color: "#4285f4",
    category: "ai",
    capabilities: ["Agent builder", "No-code agents", "Workflow automation"],
  },
};

const GITHUB_ORGS = ["chittyos", "chittyfoundation", "chittyapps", "furnished-condos"];

const SKIP_REPOS = new Set([".github", "shared", "docs", "chittyos-workspace", "ecosystem", "chittychat-sessions", "chittyxl"]);

function formatRepoName(name: string): string {
  return name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

async function fetchOrgRepos(org: string): Promise<any[]> {
  const headers: Record<string, string> = { "User-Agent": "ChittyAgent-Studio" };
  const token = typeof process !== "undefined" ? process.env?.GITHUB_TOKEN : undefined;
  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  const url = `https://api.github.com/orgs/${org}/repos?per_page=100&sort=updated`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    console.warn(`GitHub API returned ${response.status} for ${org}`);
    return [];
  }

  const repos: any[] = await response.json();
  return repos;
}

export async function syncGithubRepos(db: AppDb): Promise<void> {
  try {
    console.log(`Syncing repos from ${GITHUB_ORGS.length} GitHub orgs...`);

    let allRepos: { repo: any; org: string }[] = [];

    for (const org of GITHUB_ORGS) {
      const repos = await fetchOrgRepos(org);
      console.log(`  ${org}: ${repos.length} repos`);
      for (const repo of repos) {
        allRepos.push({ repo, org });
      }
    }

    console.log(`Fetched ${allRepos.length} total repos from GitHub`);

    await db.delete(githubRepos);

    for (const { repo, org } of allRepos) {
      await db.insert(githubRepos).values({
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || null,
        language: repo.language || null,
        htmlUrl: repo.html_url,
        org,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        updatedAt: repo.updated_at ? new Date(repo.updated_at) : null,
      });
    }

    console.log(`Synced ${allRepos.length} repos to database`);

    const existingSkills = await db.select().from(skills);
    const existingRepoNames = new Set(existingSkills.map((s) => s.repoName));

    let newSkillCount = 0;
    for (const { repo, org } of allRepos) {
      if (SKIP_REPOS.has(repo.name)) continue;
      if (existingRepoNames.has(repo.name)) continue;

      const mapping = skillMappings[repo.name];
      const skillName = formatRepoName(repo.name);
      const description = repo.description || `${skillName} - ${org} ecosystem service`;

      await db.insert(skills).values({
        name: skillName,
        description: description,
        icon: mapping?.icon || "puzzle",
        color: mapping?.color || "#4285f4",
        category: mapping?.category || "utility",
        repoUrl: repo.html_url,
        repoName: repo.name,
        language: repo.language || null,
        isEcosystem: true,
        capabilities: mapping?.capabilities || [],
        status: "available",
      });
      newSkillCount++;
    }

    if (newSkillCount > 0) {
      console.log(`Added ${newSkillCount} new skills from GitHub repos`);
    }
  } catch (error) {
    console.error("Failed to sync GitHub repos:", error);
  }
}

export async function seedDatabase(db: AppDb) {
  try {
    const existingTemplates = await db.select().from(agents).where(eq(agents.isTemplate, true));
    if (existingTemplates.length === 0) {
      for (const template of templateData) {
        await db.insert(agents).values({
          ...template,
          triggerConfig: {},
          actions: [],
          skillIds: [],
        });
      }
      console.log(`Seeded ${templateData.length} templates`);
    }

    await syncGithubRepos(db);
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
