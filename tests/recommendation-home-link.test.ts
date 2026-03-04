import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const homeContent = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/home.tsx"),
  "utf-8"
);

describe("Home Page Recommendation Link", () => {
  it("has a link to /agents/recommend", () => {
    expect(homeContent).toContain("/agents/recommend");
  });

  it("uses Wand2 icon for the recommendation CTA", () => {
    expect(homeContent).toContain("Wand2");
  });
});
