import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const storageContent = fs.readFileSync(
  path.resolve(__dirname, "../server/storage.ts"),
  "utf-8"
);

describe("Recommendation Storage", () => {
  it("IStorage interface includes getRecommendations", () => {
    expect(storageContent).toContain("getRecommendations(): Promise<Recommendation[]>");
  });

  it("IStorage interface includes getRecommendation", () => {
    expect(storageContent).toContain("getRecommendation(id: string): Promise<Recommendation | undefined>");
  });

  it("IStorage interface includes createRecommendation", () => {
    expect(storageContent).toContain("createRecommendation(data: InsertRecommendation): Promise<Recommendation>");
  });

  it("IStorage interface includes acceptRecommendation", () => {
    expect(storageContent).toContain("acceptRecommendation(id: string, agentId: string): Promise<Recommendation | undefined>");
  });

  it("imports Recommendation types from schema", () => {
    expect(storageContent).toContain("Recommendation");
    expect(storageContent).toContain("InsertRecommendation");
    expect(storageContent).toContain("recommendations");
  });

  it("DatabaseStorage implements all recommendation methods", () => {
    expect(storageContent).toContain("async getRecommendations()");
    expect(storageContent).toContain("async getRecommendation(id: string)");
    expect(storageContent).toContain("async createRecommendation(data: InsertRecommendation)");
    expect(storageContent).toContain("async acceptRecommendation(id: string, agentId: string)");
  });
});
