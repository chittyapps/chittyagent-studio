import { type AgentRun, type StepLog } from "@shared/schema";
import {
  CheckCircle2, XCircle, Loader2, Clock,
  ChevronDown, ChevronRight, Sparkles, Zap, Globe,
  Mail, Code, Shuffle, Bell, Layers, GitBranch, Repeat, CircleStop, Puzzle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-500", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  running: { icon: Loader2, color: "text-blue-500", label: "Running" },
};

const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  trigger: Zap,
  llmAction: Sparkles,
  skillAction: Puzzle,
  httpRequest: Globe,
  email: Mail,
  codeScript: Code,
  dataTransform: Shuffle,
  notification: Bell,
  subWorkflow: Layers,
  condition: GitBranch,
  loop: Repeat,
  delay: Clock,
  end: CircleStop,
};

const stepStatusStyles: Record<string, string> = {
  completed: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-900/10",
  running: "border-blue-200 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-900/10",
  failed: "border-red-200 bg-red-50/50 dark:border-red-800/30 dark:bg-red-900/10",
  pending: "border-muted bg-muted/20",
};

export function RunHistoryItem({ run }: { run: AgentRun }) {
  const [expanded, setExpanded] = useState(run.status === "running");
  const config = statusConfig[run.status] || statusConfig.running;
  const StatusIcon = config.icon;
  const stepLogs = (run.stepLogs || []) as StepLog[];
  const hasSteps = stepLogs.length > 0;

  return (
    <div className="py-3 px-1" data-testid={`run-item-${run.id}`}>
      <div
        className="flex items-center gap-3 cursor-pointer"
        onClick={() => hasSteps && setExpanded(!expanded)}
      >
        {hasSteps ? (
          expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-4" />
        )}
        <StatusIcon className={`w-4 h-4 shrink-0 ${config.color} ${run.status === "running" ? "animate-spin" : ""}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{config.label}</span>
            <span className="text-xs text-muted-foreground">{run.triggerInfo}</span>
            {run.status !== "running" && (
              <span className="text-xs text-muted-foreground">
                ({run.stepsCompleted}/{run.totalSteps} steps)
              </span>
            )}
          </div>
          {run.status !== "running" && run.result && !expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{run.result.split("\n")[0]}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
        </div>
      </div>

      {expanded && hasSteps && (
        <div className="mt-3 ml-8 space-y-2">
          {stepLogs.map((step, i) => {
            const NodeIcon = nodeIcons[step.nodeType] || Zap;
            const stepStyle = stepStatusStyles[step.status] || stepStatusStyles.pending;

            return (
              <div
                key={i}
                className={`rounded-lg border p-3 ${stepStyle}`}
                data-testid={`step-log-${i}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <NodeIcon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs font-medium">{step.label}</span>
                  <span className="text-[10px] text-muted-foreground">{step.nodeType}</span>
                  {step.status === "running" && (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500 ml-auto" />
                  )}
                  {step.status === "completed" && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 ml-auto" />
                  )}
                  {step.status === "failed" && (
                    <XCircle className="w-3 h-3 text-red-500 ml-auto" />
                  )}
                </div>
                {step.output && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed mt-1">
                    {step.output}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RunHistoryEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center" data-testid="run-history-empty">
      <Clock className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">No runs yet</p>
      <p className="text-xs text-muted-foreground/70">Run your agent to see activity here</p>
    </div>
  );
}
