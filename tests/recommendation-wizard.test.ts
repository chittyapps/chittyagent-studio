import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const PAGES_DIR = path.resolve(__dirname, "../client/src/pages");
const APP_FILE = path.resolve(__dirname, "../client/src/App.tsx");

describe("Recommendation Wizard Page", () => {
  const wizardContent = fs.readFileSync(path.join(PAGES_DIR, "agent-recommend.tsx"), "utf-8");
  const appContent = fs.readFileSync(APP_FILE, "utf-8");

  describe("page structure", () => {
    it("exports a default component", () => {
      expect(wizardContent).toContain("export default function");
    });

    it("has a prompt textarea input", () => {
      expect(wizardContent.toLowerCase()).toContain("textarea");
    });

    it("manages wizard steps (describe, review)", () => {
      expect(wizardContent).toContain("describe");
      expect(wizardContent).toContain("review");
    });

    it("calls POST /api/recommendations/generate", () => {
      expect(wizardContent).toContain("/api/recommendations/generate");
    });

    it("uses useMutationWithToast for the generate mutation", () => {
      expect(wizardContent).toContain("useMutationWithToast");
      expect(wizardContent).toContain('from "@/hooks/use-mutation-with-toast"');
    });

    it("uses apiRequest for API calls", () => {
      expect(wizardContent).toContain("apiRequest");
    });

    it("has Create Agent and Open in Builder actions", () => {
      expect(wizardContent).toContain("Create Agent");
      expect(wizardContent).toContain("Open in Builder");
    });

    it("shows confidence score", () => {
      expect(wizardContent).toContain("confidence");
    });

    it("shows reasoning text", () => {
      expect(wizardContent).toContain("reasoning");
    });
  });

  describe("routing", () => {
    it("App.tsx has a route for /agents/recommend", () => {
      expect(appContent).toContain("/agents/recommend");
    });

    it("App.tsx imports AgentRecommend component", () => {
      expect(appContent).toContain("AgentRecommend");
    });

    it("recommend route is before /agents/:id to avoid param conflict", () => {
      const recommendIndex = appContent.indexOf("/agents/recommend");
      const detailIndex = appContent.indexOf("/agents/:id");
      expect(recommendIndex).toBeLessThan(detailIndex);
    });
  });
});
