import { useQuery } from "@tanstack/react-query";
import { type Agent } from "@shared/schema";
import { AgentCard, AgentCardSkeleton } from "@/components/agent-card";
import { TemplateCard, TemplateCardSkeleton } from "@/components/template-card";
import { EmptyState } from "@/components/empty-state";
import { Sparkles, LayoutGrid, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [, navigate] = useLocation();

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const { data: templates, isLoading: templatesLoading } = useQuery<Agent[]>({
    queryKey: ["/api/templates"],
  });

  const myAgents = agents?.filter((a) => !a.isTemplate) || [];
  const hasAgents = myAgents.length > 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">ChittyAgent Studio</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-8">
          Build AI agents to automate your everyday work
        </p>
      </div>

      {agentsLoading ? (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Your agents
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <AgentCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ) : hasAgents ? (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Your agents
            </h2>
            <span className="text-xs text-muted-foreground">{myAgents.length} agent{myAgents.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState />
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Templates
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/templates")}
            className="text-xs"
            data-testid="button-view-templates"
          >
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {templatesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {templates?.slice(0, 8).map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
