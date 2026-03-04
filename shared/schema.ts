import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("bot"),
  color: text("color").notNull().default("#4285f4"),
  status: text("status").notNull().default("draft"),
  triggerType: text("trigger_type").notNull().default("manual"),
  triggerConfig: jsonb("trigger_config").$type<Record<string, unknown>>().default({}),
  actions: jsonb("actions").$type<WorkflowData | AgentAction[]>().default({ nodes: [], edges: [] }),
  prompt: text("prompt").notNull().default(""),
  category: text("category").notNull().default("general"),
  isTemplate: boolean("is_template").notNull().default(false),
  skillIds: text("skill_ids").array().default([]),
  complianceConfig: jsonb("compliance_config").$type<ComplianceConfig>().default({
    level: "recommended",
    enabledRules: [],
    customRules: [],
  }),
  runsCount: integer("runs_count").notNull().default(0),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export interface AgentAction {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

export interface WorkflowData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    label?: string;
  }>;
}

export interface ComplianceConfig {
  level: "permissive" | "recommended" | "strict";
  enabledRules: string[];
  customRules: Array<{ id: string; name: string; expression: string }>;
}

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  runsCount: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

const agentActionSchema = z.object({
  id: z.string(),
  type: z.string(),
  label: z.string(),
  config: z.record(z.unknown()),
});

const complianceConfigSchema = z.object({
  level: z.enum(["permissive", "recommended", "strict"]).default("recommended"),
  enabledRules: z.array(z.string()).default([]),
  customRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    expression: z.string(),
  })).default([]),
}).default({ level: "recommended", enabledRules: [], customRules: [] });

export const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(1, "Description is required").max(500),
  prompt: z.string().max(5000).default(""),
  icon: z.string().default("bot"),
  color: z.string().default("#4285f4"),
  status: z.string().default("draft"),
  triggerType: z.string().default("manual"),
  triggerConfig: z.record(z.unknown()).default({}),
  actions: z.any().default({ nodes: [], edges: [] }),
  category: z.string().default("general"),
  skillIds: z.array(z.string()).default([]),
  complianceConfig: complianceConfigSchema,
});

export const updateAgentSchema = createAgentSchema.partial();

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

export const agentRuns = pgTable("agent_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull(),
  status: text("status").notNull().default("running"),
  triggerInfo: text("trigger_info").notNull().default("Manual trigger"),
  result: text("result"),
  stepsCompleted: integer("steps_completed").notNull().default(0),
  totalSteps: integer("total_steps").notNull().default(1),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRuns.$inferSelect;

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

export const skills = pgTable("skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("puzzle"),
  color: text("color").notNull().default("#4285f4"),
  category: text("category").notNull().default("utility"),
  repoUrl: text("repo_url"),
  repoName: text("repo_name"),
  language: text("language"),
  isEcosystem: boolean("is_ecosystem").notNull().default(false),
  capabilities: text("capabilities").array().default([]),
  status: text("status").notNull().default("available"),
  installCount: integer("install_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  installCount: true,
  createdAt: true,
});

export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;

export const githubRepos = pgTable("github_repos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  language: text("language"),
  htmlUrl: text("html_url").notNull(),
  org: text("org").notNull().default("chittyos"),
  stars: integer("stars").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  updatedAt: timestamp("updated_at"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export const insertGithubRepoSchema = createInsertSchema(githubRepos).omit({
  id: true,
  syncedAt: true,
});

export type InsertGithubRepo = z.infer<typeof insertGithubRepoSchema>;
export type GithubRepo = typeof githubRepos.$inferSelect;
