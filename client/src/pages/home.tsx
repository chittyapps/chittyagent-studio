import { useQuery } from "@tanstack/react-query";
import { type Agent, type Skill } from "@shared/schema";
import { AgentCard, AgentCardSkeleton } from "@/components/agent-card";
import { TemplateCard, TemplateCardSkeleton } from "@/components/template-card";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import { iconMap } from "@/lib/icons";
import {
  Sparkles, LayoutGrid, ArrowRight, Puzzle, Wand2,
} from "lucide-react";
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

  const { data: allSkills, isLoading: skillsLoading } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
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
        <div className="flex items-center gap-2 mt-3 ml-8">
          <Button
            size="sm"
            onClick={() => navigate("/agents/recommend")}
            data-testid="button-recommend"
          >
            <Wand2 className="w-3.5 h-3.5 mr-1.5" />
            Get AI Recommendation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/agents/new")}
            data-testid="button-create-agent"
          >
            Create Agent
          </Button>
        </div>
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

      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Puzzle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Ecosystem Skills
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/skills")}
            className="text-xs"
            data-testid="button-view-skills"
          >
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {skillsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="p-3">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-muted" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {allSkills?.slice(0, 10).map((skill) => {
              const IconComponent = iconMap[skill.icon] || Puzzle;
              return (
                <Card
                  key={skill.id}
                  className="p-3 cursor-pointer hover-elevate transition-all"
                  onClick={() => navigate("/skills")}
                  data-testid={`card-skill-${skill.id}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: skill.color + "18", color: skill.color }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{skill.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{skill.category}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

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
