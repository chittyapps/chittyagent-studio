import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Agent } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users, Clock, Play
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bot: Bot,
  mail: Mail,
  file: FileText,
  calendar: Calendar,
  message: MessageSquare,
  search: Search,
  zap: Zap,
  shield: Shield,
  chart: BarChart3,
  users: Users,
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  draft: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paused: "bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400",
};

export function AgentCard({ agent }: { agent: Agent }) {
  const [, navigate] = useLocation();
  const IconComponent = iconMap[agent.icon] || Bot;

  return (
    <Card
      className="group cursor-pointer p-4 hover-elevate transition-all duration-200"
      onClick={() => navigate(`/agents/${agent.id}`)}
      data-testid={`card-agent-${agent.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: agent.color + "18", color: agent.color }}
        >
          <IconComponent className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">{agent.name}</h3>
            <Badge
              variant="secondary"
              className={`text-[10px] px-1.5 py-0 ${statusColors[agent.status] || ""}`}
            >
              {agent.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {agent.description}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              {agent.runsCount} runs
            </span>
            {agent.lastRunAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(agent.lastRunAt), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function AgentCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-muted animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    </Card>
  );
}
