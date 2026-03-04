import { describe, it, expect } from "vitest";
import { recommendationRequestSchema, recommendationResponseSchema } from "../shared/schema";

describe("Recommendation Schemas", () => {
  describe("recommendationRequestSchema", () => {
    it("accepts valid prompt-only request", () => {
      const result = recommendationRequestSchema.safeParse({
        prompt: "I want an agent that monitors emails and routes urgent ones to support",
      });
      expect(result.success).toBe(true);
    });

    it("accepts request with optional category and triggerType", () => {
      const result = recommendationRequestSchema.safeParse({
        prompt: "Email monitoring agent",
        category: "email",
        triggerType: "email",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty prompt", () => {
      const result = recommendationRequestSchema.safeParse({ prompt: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing prompt", () => {
      const result = recommendationRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects prompt over 2000 characters", () => {
      const result = recommendationRequestSchema.safeParse({
        prompt: "a".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("recommendationResponseSchema", () => {
    it("validates a full recommendation response", () => {
      const result = recommendationResponseSchema.safeParse({
        name: "Email Triage Bot",
        description: "Monitors incoming emails and routes urgent ones",
        prompt: "Monitor emails, classify urgency, route to appropriate team",
        category: "email",
        icon: "mail",
        color: "#4285f4",
        triggerType: "email",
        triggerConfig: { fromFilter: "@company.com" },
        skillIds: ["skill-1"],
        actions: { nodes: [], edges: [] },
        confidence: 0.85,
        reasoning: "Matched email category with high confidence",
      });
      expect(result.success).toBe(true);
    });

    it("requires confidence between 0 and 1", () => {
      const base = {
        name: "Test",
        description: "Test",
        prompt: "",
        category: "general",
        icon: "bot",
        color: "#4285f4",
        triggerType: "manual",
        triggerConfig: {},
        skillIds: [],
        actions: { nodes: [], edges: [] },
        reasoning: "test",
      };
      expect(recommendationResponseSchema.safeParse({ ...base, confidence: 1.5 }).success).toBe(false);
      expect(recommendationResponseSchema.safeParse({ ...base, confidence: -0.1 }).success).toBe(false);
      expect(recommendationResponseSchema.safeParse({ ...base, confidence: 0.5 }).success).toBe(true);
    });
  });
});
