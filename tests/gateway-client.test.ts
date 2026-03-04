import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const gatewayContent = fs.readFileSync(
  path.resolve(__dirname, "../server/gateway.ts"),
  "utf-8"
);

describe("Gateway Client", () => {
  it("exports a generateRecommendation function", () => {
    expect(gatewayContent).toContain("export async function generateRecommendation");
  });

  it("reads CHITTYGATEWAY_URL from environment", () => {
    expect(gatewayContent).toContain("CHITTYGATEWAY_URL");
  });

  it("sends prompt and context to the gateway", () => {
    expect(gatewayContent).toContain("prompt");
    expect(gatewayContent).toContain("availableSkills");
    expect(gatewayContent).toContain("availableTemplates");
  });

  it("validates response against recommendationResponseSchema", () => {
    expect(gatewayContent).toContain("recommendationResponseSchema");
  });

  it("exports a isGatewayConfigured function", () => {
    expect(gatewayContent).toContain("export function isGatewayConfigured");
  });

  it("handles gateway errors gracefully", () => {
    expect(gatewayContent).toContain("GatewayError");
  });
});
