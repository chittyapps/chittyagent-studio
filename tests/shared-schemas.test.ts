import { describe, it, expect } from "vitest";
import { createAgentSchema, updateAgentSchema } from "../shared/schema";

describe("Shared Validation Schemas", () => {
  describe("createAgentSchema", () => {
    it("accepts valid full agent data", () => {
      const result = createAgentSchema.safeParse({
        name: "Test Agent",
        description: "A test agent for validation",
        prompt: "Do something useful",
        icon: "bot",
        color: "#4285f4",
        status: "draft",
        triggerType: "manual",
        category: "general",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimal required fields and applies defaults", () => {
      const result = createAgentSchema.safeParse({
        name: "Minimal Agent",
        description: "Just the basics",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe("bot");
        expect(result.data.color).toBe("#4285f4");
        expect(result.data.status).toBe("draft");
        expect(result.data.triggerType).toBe("manual");
        expect(result.data.category).toBe("general");
        expect(result.data.prompt).toBe("");
        expect(result.data.actions).toEqual({ nodes: [], edges: [] });
        expect(result.data.skillIds).toEqual([]);
        expect(result.data.triggerConfig).toEqual({});
      }
    });

    it("rejects missing name", () => {
      const result = createAgentSchema.safeParse({
        description: "No name provided",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing description", () => {
      const result = createAgentSchema.safeParse({
        name: "No Description",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = createAgentSchema.safeParse({
        name: "",
        description: "Has description",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name over 100 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "a".repeat(101),
        description: "Has description",
      });
      expect(result.success).toBe(false);
    });

    it("rejects description over 500 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "Valid Name",
        description: "a".repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it("rejects prompt over 5000 characters", () => {
      const result = createAgentSchema.safeParse({
        name: "Valid Name",
        description: "Valid description",
        prompt: "a".repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid actions array", () => {
      const result = createAgentSchema.safeParse({
        name: "With Actions",
        description: "Has actions",
        actions: [
          { id: "1", type: "email", label: "Send Email", config: { to: "test@test.com" } },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid skillIds array", () => {
      const result = createAgentSchema.safeParse({
        name: "With Skills",
        description: "Has skills",
        skillIds: ["skill-1", "skill-2"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skillIds).toEqual(["skill-1", "skill-2"]);
      }
    });

    it("accepts valid complianceConfig", () => {
      const result = createAgentSchema.safeParse({
        name: "Compliant Agent",
        description: "Has compliance config",
        complianceConfig: {
          level: "recommended",
          enabledRules: ["has-trigger", "has-end-node"],
          customRules: [],
        },
      });
      expect(result.success).toBe(true);
    });

    it("applies default complianceConfig when omitted", () => {
      const result = createAgentSchema.safeParse({
        name: "Default Agent",
        description: "No compliance config",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.complianceConfig).toEqual({
          level: "recommended",
          enabledRules: [],
          customRules: [],
        });
      }
    });
  });

  describe("updateAgentSchema", () => {
    it("accepts partial updates (single field)", () => {
      const result = updateAgentSchema.safeParse({
        name: "Updated Name",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty object (no changes)", () => {
      const result = updateAgentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts status update only", () => {
      const result = updateAgentSchema.safeParse({
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("still validates field constraints on provided fields", () => {
      const result = updateAgentSchema.safeParse({
        name: "", // Empty name should still fail
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid prompt length when provided", () => {
      const result = updateAgentSchema.safeParse({
        prompt: "a".repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Schema consistency", () => {
    it("updateAgentSchema is a partial version of createAgentSchema", () => {
      // All fields from createAgentSchema should be optional in updateAgentSchema
      const fullData = {
        name: "Test",
        description: "Test",
        prompt: "Test",
        icon: "bot",
        color: "#fff",
        status: "draft",
        triggerType: "manual",
        triggerConfig: {},
        actions: { nodes: [], edges: [] },
        category: "general",
        skillIds: [],
        complianceConfig: { level: "recommended", enabledRules: [], customRules: [] },
      };

      // Full data should pass both
      expect(createAgentSchema.safeParse(fullData).success).toBe(true);
      expect(updateAgentSchema.safeParse(fullData).success).toBe(true);

      // Each individual field should pass update schema
      for (const [key, value] of Object.entries(fullData)) {
        const partial = { [key]: value };
        const result = updateAgentSchema.safeParse(partial);
        expect(result.success).toBe(true);
      }
    });
  });
});
