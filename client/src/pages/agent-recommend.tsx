import { useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import type { Agent, Recommendation, RecommendationResponse } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Wand2,
  ChevronRight,
  RotateCcw,
  Pencil,
  Bot,
} from "lucide-react";
import { CATEGORY_LABELS, TRIGGER_LABELS } from "@/lib/constants";
import { iconMap } from "@/lib/icons";

type WizardStep = "describe" | "review";

export default function AgentRecommend() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<WizardStep>("describe");
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [triggerType, setTriggerType] = useState<string | undefined>();
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const generateMutation = useMutationWithToast<Recommendation, void>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/recommendations/generate", {
        prompt,
        category: category || undefined,
        triggerType: triggerType || undefined,
      });
      return res.json();
    },
    successMessage: "Recommendation generated",
    onSuccess: (data) => {
      setRecommendation(data);
      setStep("review");
    },
  });

  const createAgentMutation = useMutationWithToast<Agent, void>({
    mutationFn: async () => {
      const rec = recommendation!.result as RecommendationResponse;
      const res = await apiRequest("POST", "/api/agents", {
        name: rec.name,
        description: rec.description,
        prompt: rec.prompt,
        category: rec.category,
        icon: rec.icon,
        color: rec.color,
        triggerType: rec.triggerType,
        triggerConfig: rec.triggerConfig,
        skillIds: rec.skillIds,
        actions: rec.actions,
      });
      return res.json();
    },
    invalidateKeys: [["/api/agents"], ["/api/recommendations"]],
    successMessage: "Agent created from recommendation",
    onSuccess: async (agent) => {
      if (recommendation) {
        await apiRequest("PATCH", `/api/recommendations/${recommendation.id}/accept`, {
          agentId: agent.id,
        });
      }
      navigate(`/agents/${agent.id}`);
    },
  });

  const openInBuilderMutation = useMutationWithToast<Agent, void>({
    mutationFn: async () => {
      const rec = recommendation!.result as RecommendationResponse;
      const res = await apiRequest("POST", "/api/agents", {
        name: rec.name,
        description: rec.description,
        prompt: rec.prompt,
        category: rec.category,
        icon: rec.icon,
        color: rec.color,
        triggerType: rec.triggerType,
        triggerConfig: rec.triggerConfig,
        skillIds: rec.skillIds,
        actions: rec.actions,
        status: "draft",
      });
      return res.json();
    },
    invalidateKeys: [["/api/agents"], ["/api/recommendations"]],
    successMessage: "Agent created — opening builder",
    onSuccess: async (agent) => {
      if (recommendation) {
        await apiRequest("PATCH", `/api/recommendations/${recommendation.id}/accept`, {
          agentId: agent.id,
        });
      }
      navigate(`/agents/${agent.id}/edit`);
    },
  });

  const rec = recommendation?.result as RecommendationResponse | undefined;
  const IconComponent = rec ? iconMap[rec.icon] || Bot : Bot;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
          <Wand2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Agent Recommendation</h1>
          <p className="text-sm text-muted-foreground">
            Describe what you need and we'll generate a complete agent configuration
          </p>
        </div>
      </div>

      {step === "describe" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">What should this agent do?</label>
            <Textarea
              placeholder="e.g. I want an agent that monitors customer emails, classifies urgency, and routes urgent ones to the support team..."
              className="min-h-[140px] resize-none"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              data-testid="input-recommendation-prompt"
            />
            <p className="text-xs text-muted-foreground">{prompt.length}/2000</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category (optional)</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trigger type (optional)</label>
              <Select value={triggerType} onValueChange={setTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => generateMutation.mutate()}
            disabled={!prompt.trim() || generateMutation.isPending}
            className="w-full"
            size="lg"
            data-testid="button-generate"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            Generate Recommendation
          </Button>
        </div>
      )}

      {step === "review" && rec && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: rec.color + "18", color: rec.color }}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{rec.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <Badge variant="secondary">
                  {Math.round(rec.confidence * 100)}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline">{CATEGORY_LABELS[rec.category] || rec.category}</Badge>
                <Badge variant="outline">{TRIGGER_LABELS[rec.triggerType] || rec.triggerType}</Badge>
                <Badge variant="outline">{rec.skillIds.length} skills</Badge>
                <Badge variant="outline">
                  {(rec.actions?.nodes?.length || 0)} workflow nodes
                </Badge>
              </div>
            </CardContent>
          </Card>

          {rec.prompt && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Agent Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rec.prompt}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Why this recommendation?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={() => createAgentMutation.mutate()}
              disabled={createAgentMutation.isPending}
              data-testid="button-create-from-rec"
            >
              {createAgentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4 mr-1" />
              )}
              Create Agent
            </Button>
            <Button
              variant="outline"
              onClick={() => openInBuilderMutation.mutate()}
              disabled={openInBuilderMutation.isPending}
              data-testid="button-open-in-builder"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Open in Builder
            </Button>
            <Button
              variant="ghost"
              onClick={() => setStep("describe")}
              data-testid="button-try-again"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
