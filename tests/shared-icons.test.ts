import { describe, it, expect } from "vitest";
import { iconMap } from "../client/src/lib/icons";

describe("Shared Icon Map", () => {
  it("exports all expected icon keys", () => {
    const expectedKeys = [
      "bot", "mail", "file", "calendar", "message",
      "search", "zap", "shield", "chart", "users", "puzzle",
    ];
    for (const key of expectedKeys) {
      expect(iconMap).toHaveProperty(key);
    }
  });

  it("each icon is a valid React component", () => {
    for (const [key, component] of Object.entries(iconMap)) {
      // Lucide icons can be functions or objects with render method
      const isValid = typeof component === "function" || typeof component === "object";
      expect(isValid, `Icon "${key}" should be a function or object`).toBe(true);
      expect(component).toBeTruthy();
    }
  });

  it("does not contain unexpected keys", () => {
    const validKeys = new Set([
      "bot", "mail", "file", "calendar", "message",
      "search", "zap", "shield", "chart", "users", "puzzle",
    ]);
    for (const key of Object.keys(iconMap)) {
      expect(validKeys.has(key)).toBe(true);
    }
  });
});
