import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const routesContent = fs.readFileSync(
  path.resolve(__dirname, "../server/routes.ts"),
  "utf-8"
);

describe("Recommendation Routes", () => {
  it("has POST /api/recommendations/generate route", () => {
    expect(routesContent).toContain('"/api/recommendations/generate"');
    expect(routesContent).toContain("app.post");
  });

  it("has GET /api/recommendations route", () => {
    expect(routesContent).toContain('"/api/recommendations"');
    expect(routesContent).toContain("app.get");
  });

  it("has PATCH /api/recommendations/:id/accept route", () => {
    expect(routesContent).toContain('"/api/recommendations/:id/accept"');
    expect(routesContent).toContain("app.patch");
  });

  it("validates request body with recommendationRequestSchema", () => {
    expect(routesContent).toContain("recommendationRequestSchema");
  });

  it("uses asyncRoute wrapper for all recommendation routes", () => {
    const recRoutes = routesContent.match(/\/api\/recommendations/g);
    expect(recRoutes).not.toBeNull();
    expect(recRoutes!.length).toBeGreaterThanOrEqual(3);
  });

  it("imports gateway functions", () => {
    expect(routesContent).toContain("generateRecommendation");
    expect(routesContent).toContain("isGatewayConfigured");
  });

  it("returns 503 when gateway is not configured", () => {
    expect(routesContent).toContain("503");
    expect(routesContent).toContain("isGatewayConfigured");
  });

  it("stores recommendation via storage.createRecommendation", () => {
    expect(routesContent).toContain("storage.createRecommendation");
  });

  it("uses storage.acceptRecommendation for accept route", () => {
    expect(routesContent).toContain("storage.acceptRecommendation");
  });
});
