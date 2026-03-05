import { useQuery } from "@tanstack/react-query";
import { type Connection } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { iconMap } from "@/lib/icons";
import {
  Plug, CheckCircle2, XCircle, AlertCircle, Loader2, RefreshCw, Bot,
} from "lucide-react";

const CONNECTION_STATUS: Record<string, { label: string; color: string; Icon: any }> = {
  connected: { label: "Connected", color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400", Icon: CheckCircle2 },
  disconnected: { label: "Not connected", color: "text-slate-500 bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400", Icon: AlertCircle },
  error: { label: "Error", color: "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400", Icon: XCircle },
  testing: { label: "Testing...", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400", Icon: Loader2 },
};

const TYPE_LABELS: Record<string, string> = {
  ai: "AI Provider",
  source: "Data Source",
  trigger: "Trigger",
  action: "Action",
  platform: "Platform",
};

export default function Connections() {
  const { data: conns, isLoading } = useQuery<Connection[]>({
    queryKey: ["/api/connections"],
  });

  const testMutation = useMutationWithToast({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/connections/${id}/test`);
      return res.json();
    },
    invalidateKeys: [["/api/connections"]],
    successMessage: { title: "Test complete", description: "Connection test finished." },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" data-testid="text-connections-title">
            <Plug className="w-5 h-5" /> Connections
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage service connections your agents use to execute workflows
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold" data-testid="text-total-connections">
            {conns?.length || 0}
          </p>
          <p className="text-xs text-muted-foreground">Total connections</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600" data-testid="text-active-connections">
            {conns?.filter(c => c.status === "connected").length || 0}
          </p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-400" data-testid="text-inactive-connections">
            {conns?.filter(c => c.status !== "connected").length || 0}
          </p>
          <p className="text-xs text-muted-foreground">Needs setup</p>
        </Card>
      </div>

      <div className="space-y-3">
        {conns?.map((conn) => {
          const statusInfo = CONNECTION_STATUS[conn.status] || CONNECTION_STATUS.disconnected;
          const StatusIcon = statusInfo.Icon;
          const ConnIcon = iconMap[conn.icon] || Bot;
          const config = (conn.config || {}) as Record<string, unknown>;

          return (
            <Card key={conn.id} className="p-4" data-testid={`connection-card-${conn.id}`}>
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: conn.color + "18", color: conn.color }}
                >
                  <ConnIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{conn.name}</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {TYPE_LABELS[conn.type] || conn.type}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}
                    >
                      <StatusIcon className={`w-3 h-3 mr-0.5 ${conn.status === "testing" ? "animate-spin" : ""}`} />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(config.description as string) || `Provider: ${conn.provider}`}
                  </p>
                  {config.model && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Model: {config.model as string}
                    </p>
                  )}
                  {config.orgs && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Orgs: {(config.orgs as string[]).join(", ")}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={conn.status === "connected" ? "secondary" : "default"}
                  onClick={() => testMutation.mutate(conn.id)}
                  disabled={testMutation.isPending}
                  data-testid={`button-test-${conn.id}`}
                >
                  {testMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  )}
                  Test
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
