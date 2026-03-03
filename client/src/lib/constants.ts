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
