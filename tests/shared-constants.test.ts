import { describe, it, expect } from "vitest";
import {
  LANG_COLORS,
  STATUS_COLORS,
  TRIGGER_LABELS,
  CATEGORY_LABELS,
  TEMPLATE_CATEGORIES,
  SKILL_CATEGORIES,
  ORG_LABELS,
} from "../client/src/lib/constants";

describe("Shared Constants", () => {
  describe("LANG_COLORS", () => {
    it("contains all expected language colors", () => {
      expect(LANG_COLORS).toHaveProperty("TypeScript");
      expect(LANG_COLORS).toHaveProperty("JavaScript");
      expect(LANG_COLORS).toHaveProperty("Python");
      expect(LANG_COLORS).toHaveProperty("Go");
      expect(LANG_COLORS).toHaveProperty("Shell");
      expect(LANG_COLORS).toHaveProperty("HTML");
    });

    it("all color values are valid hex codes", () => {
      for (const color of Object.values(LANG_COLORS)) {
        expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });
  });

  describe("STATUS_COLORS", () => {
    it("contains all agent statuses", () => {
      expect(STATUS_COLORS).toHaveProperty("active");
      expect(STATUS_COLORS).toHaveProperty("draft");
      expect(STATUS_COLORS).toHaveProperty("paused");
    });

    it("each status has Tailwind classes for both light and dark modes", () => {
      for (const classes of Object.values(STATUS_COLORS)) {
        expect(classes).toContain("bg-");
        expect(classes).toContain("text-");
        expect(classes).toContain("dark:");
      }
    });
  });

  describe("TRIGGER_LABELS", () => {
    it("maps all trigger types to human-readable labels", () => {
      expect(TRIGGER_LABELS.manual).toBe("Manual trigger");
      expect(TRIGGER_LABELS.schedule).toBe("Scheduled");
      expect(TRIGGER_LABELS.email).toBe("Email received");
      expect(TRIGGER_LABELS.webhook).toBe("Webhook");
      expect(TRIGGER_LABELS.event).toBe("Event-based");
    });
  });

  describe("CATEGORY_LABELS", () => {
    it("maps all category keys to display labels", () => {
      expect(CATEGORY_LABELS.email).toBe("Email");
      expect(CATEGORY_LABELS.data).toBe("Data & Analytics");
      expect(CATEGORY_LABELS.general).toBe("General");
    });
  });

  describe("TEMPLATE_CATEGORIES", () => {
    it("starts with an 'All' option", () => {
      expect(TEMPLATE_CATEGORIES[0]).toEqual({ value: "all", label: "All" });
    });

    it("contains distinct values", () => {
      const values = TEMPLATE_CATEGORIES.map((c) => c.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe("SKILL_CATEGORIES", () => {
    it("starts with an 'All' option", () => {
      expect(SKILL_CATEGORIES[0]).toEqual({ value: "all", label: "All" });
    });

    it("contains distinct values", () => {
      const values = SKILL_CATEGORIES.map((c) => c.value);
      expect(new Set(values).size).toBe(values.length);
    });

    it("includes ecosystem-specific categories", () => {
      const values = SKILL_CATEGORIES.map((c) => c.value);
      expect(values).toContain("trust");
      expect(values).toContain("verification");
      expect(values).toContain("intelligence");
    });
  });

  describe("ORG_LABELS", () => {
    it("contains all org mappings", () => {
      expect(ORG_LABELS).toHaveProperty("all");
      expect(ORG_LABELS).toHaveProperty("chittyos");
      expect(ORG_LABELS).toHaveProperty("chittyfoundation");
      expect(ORG_LABELS).toHaveProperty("chittyapps");
      expect(ORG_LABELS).toHaveProperty("furnished-condos");
    });
  });
});
