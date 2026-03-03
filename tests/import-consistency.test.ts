import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Scenario tests verifying that the refactored imports are consistent:
 * - No file still has a local iconMap definition
 * - No file still has a local langColors/statusColors/etc definition
 * - Server routes imports schemas from shared, not local definitions
 */

const CLIENT_SRC = path.resolve(__dirname, "../client/src");
const SERVER_DIR = path.resolve(__dirname, "../server");

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function getClientFiles(dir: string, ext: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getClientFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Import Consistency - No duplicate definitions remain", () => {
  const tsxFiles = getClientFiles(CLIENT_SRC, ".tsx");
  const tsFiles = getClientFiles(CLIENT_SRC, ".ts").filter(
    (f) => !f.includes("/lib/icons.ts") && !f.includes("/lib/constants.ts")
  );
  const allClientFiles = [...tsxFiles, ...tsFiles];

  it("no client file defines a local iconMap (except lib/icons.ts)", () => {
    for (const file of allClientFiles) {
      const content = readFile(file);
      const hasLocalIconMap = /^const iconMap\b/m.test(content);
      expect(hasLocalIconMap, `Found local iconMap in ${file}`).toBe(false);
    }
  });

  it("no client file defines a local langColors (except lib/constants.ts)", () => {
    for (const file of allClientFiles) {
      const content = readFile(file);
      const hasLocalDef = /^const langColors\b/m.test(content);
      expect(hasLocalDef, `Found local langColors in ${file}`).toBe(false);
    }
  });

  it("no client file defines a local statusColors (except lib/constants.ts)", () => {
    for (const file of allClientFiles) {
      const content = readFile(file);
      const hasLocalDef = /^const statusColors\b/m.test(content);
      expect(hasLocalDef, `Found local statusColors in ${file}`).toBe(false);
    }
  });

  it("no client file defines a local triggerLabels (except lib/constants.ts)", () => {
    for (const file of allClientFiles) {
      const content = readFile(file);
      const hasLocalDef = /^const triggerLabels\b/m.test(content);
      expect(hasLocalDef, `Found local triggerLabels in ${file}`).toBe(false);
    }
  });

  it("no client file defines a local categoryLabels (except lib/constants.ts)", () => {
    for (const file of allClientFiles) {
      const content = readFile(file);
      const hasLocalDef = /^const categoryLabels\b/m.test(content);
      expect(hasLocalDef, `Found local categoryLabels in ${file}`).toBe(false);
    }
  });

  it("server routes.ts does not define local createAgentSchema or updateAgentSchema", () => {
    const routesContent = readFile(path.join(SERVER_DIR, "routes.ts"));
    expect(/^const createAgentSchema\b/m.test(routesContent)).toBe(false);
    expect(/^const updateAgentSchema\b/m.test(routesContent)).toBe(false);
  });

  it("server routes.ts imports schemas from @shared/schema", () => {
    const routesContent = readFile(path.join(SERVER_DIR, "routes.ts"));
    expect(routesContent).toContain('from "@shared/schema"');
    expect(routesContent).toContain("createAgentSchema");
    expect(routesContent).toContain("updateAgentSchema");
  });
});

describe("Import Consistency - All consumers import from shared modules", () => {
  const pagesDir = path.join(CLIENT_SRC, "pages");
  const componentsDir = path.join(CLIENT_SRC, "components");

  const iconConsumers = [
    path.join(pagesDir, "home.tsx"),
    path.join(pagesDir, "agent-detail.tsx"),
    path.join(pagesDir, "templates.tsx"),
    path.join(pagesDir, "template-detail.tsx"),
    path.join(pagesDir, "skills.tsx"),
    path.join(componentsDir, "agent-card.tsx"),
    path.join(componentsDir, "template-card.tsx"),
  ];

  for (const file of iconConsumers) {
    const shortName = path.relative(CLIENT_SRC, file);
    it(`${shortName} imports iconMap from @/lib/icons`, () => {
      const content = readFile(file);
      expect(content).toContain('from "@/lib/icons"');
    });
  }

  const constantConsumers = [
    { file: path.join(componentsDir, "agent-card.tsx"), imports: ["STATUS_COLORS"] },
    { file: path.join(componentsDir, "template-card.tsx"), imports: ["CATEGORY_LABELS"] },
    { file: path.join(pagesDir, "agent-detail.tsx"), imports: ["STATUS_COLORS", "TRIGGER_LABELS"] },
    { file: path.join(pagesDir, "templates.tsx"), imports: ["TEMPLATE_CATEGORIES"] },
    { file: path.join(pagesDir, "skills.tsx"), imports: ["LANG_COLORS", "SKILL_CATEGORIES"] },
    { file: path.join(pagesDir, "repos.tsx"), imports: ["LANG_COLORS", "ORG_LABELS"] },
  ];

  for (const { file, imports } of constantConsumers) {
    const shortName = path.relative(CLIENT_SRC, file);
    it(`${shortName} imports ${imports.join(", ")} from @/lib/constants`, () => {
      const content = readFile(file);
      expect(content).toContain('from "@/lib/constants"');
      for (const imp of imports) {
        expect(content).toContain(imp);
      }
    });
  }
});
