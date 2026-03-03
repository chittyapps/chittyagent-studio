export const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Go: "#00add8",
  Shell: "#89e051",
  HTML: "#e34c26",
};

export const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paused: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
};

export const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual trigger",
  schedule: "Scheduled",
  email: "Email received",
  webhook: "Webhook",
  event: "Event-based",
};

export const CATEGORY_LABELS: Record<string, string> = {
  email: "Email",
  productivity: "Productivity",
  communication: "Communication",
  data: "Data & Analytics",
  general: "General",
  hr: "HR",
  sales: "Sales",
  support: "Support",
};

export const TEMPLATE_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "email", label: "Email" },
  { value: "productivity", label: "Productivity" },
  { value: "communication", label: "Communication" },
  { value: "data", label: "Data" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
];

export const SKILL_CATEGORIES = [
  { value: "all", label: "All" },
  { value: "trust", label: "Trust" },
  { value: "verification", label: "Verification" },
  { value: "intelligence", label: "Intelligence" },
  { value: "monitoring", label: "Monitoring" },
  { value: "data", label: "Data" },
  { value: "legal", label: "Legal" },
  { value: "automation", label: "Automation" },
  { value: "ai", label: "AI" },
  { value: "communication", label: "Communication" },
  { value: "utility", label: "Utility" },
];

export const ORG_LABELS: Record<string, string> = {
  all: "All Orgs",
  chittyos: "chittyos",
  chittyfoundation: "chittyfoundation",
  chittyapps: "chittyapps",
  "furnished-condos": "furnished-condos",
};

export interface WorkflowNodeType {
  type: string;
  label: string;
  category: "flow" | "action";
  icon: string;
  color: string;
  description: string;
  handles?: {
    inputs: string[];
    outputs: string[];
  };
}

export const WORKFLOW_NODE_TYPES: WorkflowNodeType[] = [
  // Flow Control
  { type: "trigger", label: "Trigger", category: "flow", icon: "zap", color: "#f97316", description: "Entry point — starts the workflow", handles: { inputs: [], outputs: ["default"] } },
  { type: "condition", label: "Condition", category: "flow", icon: "git-branch", color: "#8b5cf6", description: "If/else branch based on expression", handles: { inputs: ["default"], outputs: ["true", "false"] } },
  { type: "loop", label: "Loop", category: "flow", icon: "repeat", color: "#8b5cf6", description: "Iterate over a collection", handles: { inputs: ["default"], outputs: ["each", "done"] } },
  { type: "delay", label: "Delay", category: "flow", icon: "clock", color: "#64748b", description: "Wait for a duration or condition", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "end", label: "End", category: "flow", icon: "circle-stop", color: "#ef4444", description: "Terminal node — marks completion", handles: { inputs: ["default"], outputs: [] } },
  // Actions
  { type: "llmAction", label: "AI / LLM", category: "action", icon: "sparkles", color: "#06b6d4", description: "Send prompt to an LLM", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "skillAction", label: "Skill", category: "action", icon: "puzzle", color: "#34a853", description: "Execute an ecosystem skill", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "httpRequest", label: "HTTP Request", category: "action", icon: "globe", color: "#3b82f6", description: "Make an external API call", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "email", label: "Email", category: "action", icon: "mail", color: "#ea4335", description: "Send an email notification", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "codeScript", label: "Code / Script", category: "action", icon: "code", color: "#a855f7", description: "Run custom JavaScript", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "dataTransform", label: "Data Transform", category: "action", icon: "shuffle", color: "#14b8a6", description: "Map, filter, or reshape data", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "subWorkflow", label: "Sub-workflow", category: "action", icon: "layers", color: "#f59e0b", description: "Run another agent as a nested flow", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "notification", label: "Notification", category: "action", icon: "bell", color: "#ec4899", description: "Send alert via channel", handles: { inputs: ["default"], outputs: ["default"] } },
];

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  level: "permissive" | "recommended" | "strict";
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  { id: "has-trigger", name: "Has trigger node", description: "Workflow must have exactly one trigger node", level: "permissive" },
  { id: "no-orphans", name: "No orphan nodes", description: "All nodes must be connected to the graph", level: "permissive" },
  { id: "has-end-node", name: "Ends with End node", description: "All paths must terminate at an End node", level: "recommended" },
  { id: "skills-available", name: "Skills available", description: "Referenced skills must be installed in ChittyOS", level: "recommended" },
  { id: "http-error-handling", name: "HTTP error handling", description: "HTTP and external action nodes must have error handling", level: "recommended" },
  { id: "data-sanitization", name: "Data sanitization", description: "Sensitive data nodes must sanitize output", level: "recommended" },
  { id: "failure-notification", name: "Failure notification", description: "Must include a notification on failure path", level: "strict" },
  { id: "max-depth", name: "Max workflow depth", description: "Workflow depth must not exceed configured limit", level: "strict" },
  { id: "no-code-nodes", name: "No code/script nodes", description: "Code/Script nodes are not allowed", level: "strict" },
  { id: "llm-model-specified", name: "LLM model specified", description: "All LLM actions must specify a model", level: "strict" },
];

export const COMPLIANCE_LEVELS = [
  { value: "permissive", label: "Permissive", description: "Only critical graph validity checks" },
  { value: "recommended", label: "Recommended", description: "Baseline ChittyOS rules" },
  { value: "strict", label: "Strict", description: "All rules enforced" },
] as const;
