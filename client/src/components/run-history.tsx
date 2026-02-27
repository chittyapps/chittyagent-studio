import { type AgentRun } from "@shared/schema";
import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "text-emerald-500", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  running: { icon: Loader2, color: "text-blue-500", label: "Running" },
};

export function RunHistoryItem({ run }: { run: AgentRun }) {
  const config = statusConfig[run.status] || statusConfig.running;
  const StatusIcon = config.icon;

  return (
    <div className="flex items-center gap-3 py-3 px-1" data-testid={`run-item-${run.id}`}>
      <StatusIcon className={`w-4 h-4 shrink-0 ${config.color} ${run.status === "running" ? "animate-spin" : ""}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{config.label}</span>
          <span className="text-xs text-muted-foreground">{run.triggerInfo}</span>
        </div>
        {run.result && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{run.result}</p>
        )}
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="w-3 h-3" />
        {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
      </div>
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
