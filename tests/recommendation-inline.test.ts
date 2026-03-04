import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const builderContent = fs.readFileSync(
  path.resolve(__dirname, "../client/src/pages/agent-builder.tsx"),
  "utf-8"
);

describe("Inline Recommendation Hints", () => {
  it("has a recommendation banner on the details tab", () => {
    expect(builderContent).toContain("/agents/recommend");
    expect(builderContent).toContain("recommendation");
  });

  it("links to the wizard with Wand2 icon", () => {
    expect(builderContent).toContain("Wand2");
  });
});
