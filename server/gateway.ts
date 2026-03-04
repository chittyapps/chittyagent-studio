import type { Skill, Agent } from "@shared/schema";
import { recommendationResponseSchema, type RecommendationResponse } from "@shared/schema";

export class GatewayError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = "GatewayError";
  }
}

export function isGatewayConfigured(): boolean {
  return !!process.env.CHITTYGATEWAY_URL;
}

interface GatewayPayload {
  prompt: string;
  category?: string;
  triggerType?: string;
  availableSkills: Array<{ id: string; name: string; category: string; capabilities: string[] | null }>;
  availableTemplates: Array<{ id: string; name: string; category: string; triggerType: string; description: string }>;
}

export async function generateRecommendation(
  prompt: string,
  availableSkills: Skill[],
  availableTemplates: Agent[],
  options?: { category?: string; triggerType?: string }
): Promise<RecommendationResponse> {
  const gatewayUrl = process.env.CHITTYGATEWAY_URL;
  if (!gatewayUrl) {
    throw new GatewayError("CHITTYGATEWAY_URL is not configured");
  }

  const payload: GatewayPayload = {
    prompt,
    category: options?.category,
    triggerType: options?.triggerType,
    availableSkills: availableSkills.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      capabilities: s.capabilities,
    })),
    availableTemplates: availableTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      triggerType: t.triggerType,
      description: t.description,
    })),
  };

  const res = await fetch(`${gatewayUrl}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new GatewayError(`Gateway returned ${res.status}: ${await res.text()}`, res.status);
  }

  const data = await res.json();
  const parsed = recommendationResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new GatewayError(`Invalid gateway response: ${parsed.error.message}`);
  }

  return parsed.data;
}
