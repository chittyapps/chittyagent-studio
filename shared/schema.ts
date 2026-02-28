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
  actions: jsonb("actions").$type<AgentAction[]>().default([]),
  prompt: text("prompt").notNull().default(""),
  category: text("category").notNull().default("general"),
  isTemplate: boolean("is_template").notNull().default(false),
  skillIds: text("skill_ids").array().default([]),
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

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  runsCount: true,
  lastRunAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

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
