import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Scenario test: verify the storage layer uses SQL increment
 * instead of the fetch-then-increment anti-pattern.
 */

const storagePath = path.resolve(__dirname, "../server/storage.ts");
const storageContent = fs.readFileSync(storagePath, "utf-8");

describe("Storage - SQL increment pattern", () => {
  it("imports sql from drizzle-orm", () => {
    expect(storageContent).toMatch(/import\s*{[^}]*\bsql\b[^}]*}\s*from\s*["']drizzle-orm["']/);
  });

  it("incrementRunCount uses SQL expression instead of fetching agent first", () => {
    // Extract the incrementRunCount method body
    const methodMatch = storageContent.match(
      /async incrementRunCount\(agentId: string\)[\s\S]*?(?=\n  async |\n})/
    );
    expect(methodMatch).not.toBeNull();
    const methodBody = methodMatch![0];

    // Should NOT fetch the agent first
    expect(methodBody).not.toContain("await this.getAgent(");

    // Should use SQL increment
    expect(methodBody).toContain("sql`");
    expect(methodBody).toMatch(/runsCount.*\+\s*1/);
  });

  it("incrementSkillInstall uses SQL expression instead of fetching skill first", () => {
    // Extract the incrementSkillInstall method body
    const methodMatch = storageContent.match(
      /async incrementSkillInstall\(id: string\)[\s\S]*?(?=\n  async |\n})/
    );
    expect(methodMatch).not.toBeNull();
    const methodBody = methodMatch![0];

    // Should NOT fetch the skill first
    expect(methodBody).not.toContain("await this.getSkill(");

    // Should use SQL increment
    expect(methodBody).toContain("sql`");
    expect(methodBody).toMatch(/installCount.*\+\s*1/);
  });
});
