import { describe, it, expect } from "vitest";
import { execSync } from "child_process";

/**
 * Scenario test: verify the refactored code compiles and builds correctly.
 */

describe("Build Integrity", { timeout: 90000 }, () => {
  it("TypeScript compiles without errors", () => {
    const result = execSync("npx tsc --noEmit 2>&1", {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 30000,
    });
    // tsc returns empty string on success
    expect(result.trim()).toBe("");
  });

  it("Vite production build succeeds", () => {
    const result = execSync("npx vite build 2>&1", {
      cwd: process.cwd(),
      encoding: "utf-8",
      timeout: 60000,
    });
    expect(result).toContain("built in");
  });
});
