import {
  type User, type InsertUser,
  type Agent, type InsertAgent,
  type AgentRun, type InsertAgentRun,
  type Skill, type InsertSkill,
  type GithubRepo, type InsertGithubRepo,
  type Recommendation, type InsertRecommendation,
  users, agents, agentRuns, skills, githubRepos, recommendations,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  updateAgent(id: string, data: Partial<InsertAgent>): Promise<Agent | undefined>;
  deleteAgent(id: string): Promise<boolean>;

  getTemplates(): Promise<Agent[]>;
  getTemplate(id: string): Promise<Agent | undefined>;

  getAgentRuns(agentId: string): Promise<AgentRun[]>;
  createAgentRun(run: InsertAgentRun): Promise<AgentRun>;
  updateAgentRun(id: string, data: Partial<AgentRun>): Promise<AgentRun | undefined>;
  incrementRunCount(agentId: string): Promise<void>;

  getSkills(): Promise<Skill[]>;
  getSkill(id: string): Promise<Skill | undefined>;
  createSkill(skill: InsertSkill): Promise<Skill>;
  incrementSkillInstall(id: string): Promise<void>;

  getGithubRepos(): Promise<GithubRepo[]>;
  createGithubRepo(repo: InsertGithubRepo): Promise<GithubRepo>;
  clearGithubRepos(): Promise<void>;

  getRecommendations(): Promise<Recommendation[]>;
  getRecommendation(id: string): Promise<Recommendation | undefined>;
  createRecommendation(data: InsertRecommendation): Promise<Recommendation>;
  acceptRecommendation(id: string, agentId: string): Promise<Recommendation | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAgents(): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.isTemplate, false)).orderBy(desc(agents.updatedAt));
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent;
  }

  async createAgent(data: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values(data as any).returning();
    return agent;
  }

  async updateAgent(id: string, data: Partial<InsertAgent>): Promise<Agent | undefined> {
    const [agent] = await db
      .update(agents)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(agents.id, id))
      .returning();
    return agent;
  }

  async deleteAgent(id: string): Promise<boolean> {
    const result = await db.delete(agents).where(eq(agents.id, id)).returning();
    return result.length > 0;
  }

  async getTemplates(): Promise<Agent[]> {
    return db.select().from(agents).where(eq(agents.isTemplate, true)).orderBy(agents.category);
  }

  async getTemplate(id: string): Promise<Agent | undefined> {
    const [template] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.isTemplate, true)));
    return template;
  }

  async getAgentRuns(agentId: string): Promise<AgentRun[]> {
    return db
      .select()
      .from(agentRuns)
      .where(eq(agentRuns.agentId, agentId))
      .orderBy(desc(agentRuns.startedAt))
      .limit(20);
  }

  async createAgentRun(data: InsertAgentRun): Promise<AgentRun> {
    const [run] = await db.insert(agentRuns).values(data).returning();
    return run;
  }

  async updateAgentRun(id: string, data: Partial<AgentRun>): Promise<AgentRun | undefined> {
    const [run] = await db.update(agentRuns).set(data).where(eq(agentRuns.id, id)).returning();
    return run;
  }

  async incrementRunCount(agentId: string): Promise<void> {
    await db
      .update(agents)
      .set({
        runsCount: sql`${agents.runsCount} + 1`,
        lastRunAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agentId));
  }

  async getSkills(): Promise<Skill[]> {
    return db.select().from(skills).orderBy(desc(skills.installCount));
  }

  async getSkill(id: string): Promise<Skill | undefined> {
    const [skill] = await db.select().from(skills).where(eq(skills.id, id));
    return skill;
  }

  async createSkill(data: InsertSkill): Promise<Skill> {
    const [skill] = await db.insert(skills).values(data).returning();
    return skill;
  }

  async incrementSkillInstall(id: string): Promise<void> {
    await db
      .update(skills)
      .set({ installCount: sql`${skills.installCount} + 1` })
      .where(eq(skills.id, id));
  }

  async getGithubRepos(): Promise<GithubRepo[]> {
    return db.select().from(githubRepos).orderBy(githubRepos.name);
  }

  async createGithubRepo(data: InsertGithubRepo): Promise<GithubRepo> {
    const [repo] = await db.insert(githubRepos).values(data).returning();
    return repo;
  }

  async clearGithubRepos(): Promise<void> {
    await db.delete(githubRepos);
  }

  async getRecommendations(): Promise<Recommendation[]> {
    return db.select().from(recommendations).orderBy(desc(recommendations.createdAt)).limit(50);
  }

  async getRecommendation(id: string): Promise<Recommendation | undefined> {
    const [rec] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return rec;
  }

  async createRecommendation(data: InsertRecommendation): Promise<Recommendation> {
    const [rec] = await db.insert(recommendations).values(data as any).returning();
    return rec;
  }

  async acceptRecommendation(id: string, agentId: string): Promise<Recommendation | undefined> {
    const [rec] = await db
      .update(recommendations)
      .set({ accepted: true, agentId })
      .where(eq(recommendations.id, id))
      .returning();
    return rec;
  }
}

export const storage = new DatabaseStorage();
