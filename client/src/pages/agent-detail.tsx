import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { type Agent, type AgentRun } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RunHistoryItem, RunHistoryEmpty } from "@/components/run-history";
import { ExportDialog } from "@/components/export-dialog";
import { iconMap } from "@/lib/icons";
import { STATUS_COLORS, TRIGGER_LABELS } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import {
  Bot, ArrowLeft, Play, Pause,
  Trash2, Settings, Clock, Activity, Loader2, Zap
} from "lucide-react";
import { useEffect, useRef } from "react";

export default function AgentDetail() {
  const [, params] = useRoute("/agents/:id");
  const [, navigate] = useLocation();
  const agentId = params?.id;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    enabled: !!agentId,
  });

  const { data: runs } = useQuery<AgentRun[]>({
    queryKey: ["/api/agents", agentId, "runs"],
    enabled: !!agentId,
  });

  const hasRunningRun = runs?.some(r => r.status === "running");

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (hasRunningRun && agentId) {
      pollRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "runs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId] });
      }, 1500);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasRunningRun, agentId]);

  const runMutation = useMutationWithToast({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agents/${agentId}/run`);
      return res.json();
    },
    invalidateKeys: [["/api/agents", agentId], ["/api/agents", agentId, "runs"], ["/api/agents"]],
    successMessage: { title: "Agent started", description: "Your agent is now running." },
  });

  const toggleMutation = useMutationWithToast({
    mutationFn: async () => {
      const newStatus = agent?.status === "active" ? "paused" : "active";
      const res = await apiRequest("PATCH", `/api/agents/${agentId}`, { status: newStatus });
      return res.json();
    },
    invalidateKeys: [["/api/agents", agentId], ["/api/agents"]],
  });

  const deleteMutation = useMutationWithToast({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/agents/${agentId}`);
    },
    invalidateKeys: [["/api/agents"]],
    successMessage: "Agent deleted",
    onSuccess: () => navigate("/"),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-muted-foreground">Agent not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to home
        </Button>
      </div>
    );
  }

  const IconComponent = iconMap[agent.icon] || Bot;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-4 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: agent.color + "18", color: agent.color }}
        >
          <IconComponent className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold" data-testid="text-agent-name">{agent.name}</h1>
            <Badge
              variant="secondary"
              className={`text-xs ${STATUS_COLORS[agent.status] || ""}`}
              data-testid="badge-agent-status"
            >
              {agent.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-agent-description">
            {agent.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Button
          size="sm"
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || hasRunningRun}
          data-testid="button-run-agent"
        >
          {runMutation.isPending || hasRunningRun ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-1" />
          )}
          {hasRunningRun ? "Running..." : "Run now"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => toggleMutation.mutate()}
          disabled={toggleMutation.isPending}
          data-testid="button-toggle-agent"
        >
          {agent.status === "active" ? (
            <><Pause className="w-4 h-4 mr-1" /> Pause</>
          ) : (
            <><Play className="w-4 h-4 mr-1" /> Activate</>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate(`/agents/${agentId}/edit`)}
          data-testid="button-edit-agent"
        >
          <Settings className="w-4 h-4 mr-1" /> Edit
        </Button>
        <ExportDialog agentId={agentId!} agentName={agent.name} agentColor={agent.color} />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => {
            if (confirm("Delete this agent?")) deleteMutation.mutate();
          }}
          data-testid="button-delete-agent"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="w-3.5 h-3.5" /> Total runs
          </div>
          <p className="text-2xl font-bold" data-testid="text-runs-count">{agent.runsCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Zap className="w-3.5 h-3.5" /> Trigger
          </div>
          <p className="text-sm font-medium" data-testid="text-trigger-type">
            {TRIGGER_LABELS[agent.triggerType] || agent.triggerType}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="w-3.5 h-3.5" /> Last run
          </div>
          <p className="text-sm font-medium" data-testid="text-last-run">
            {agent.lastRunAt
              ? new Date(agent.lastRunAt).toLocaleDateString()
              : "Never"}
          </p>
        </Card>
      </div>

      {agent.prompt && (
        <Card className="p-4 mb-6">
          <h3 className="text-sm font-semibold mb-2">Agent Instructions</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-agent-prompt">
            {agent.prompt}
          </p>
        </Card>
      )}

      <Separator className="mb-6" />

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Run History
        </h3>
        {!runs || runs.length === 0 ? (
          <RunHistoryEmpty />
        ) : (
          <div className="divide-y">
            {runs.map((run) => (
              <RunHistoryItem key={run.id} run={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
