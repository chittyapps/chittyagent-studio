import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type Skill } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { iconMap } from "@/lib/icons";
import { LANG_COLORS, SKILL_CATEGORIES } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import {
  ArrowLeft, Download, ExternalLink, Puzzle,
  Loader2, Github
} from "lucide-react";
import { useState } from "react";

export default function Skills() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: allSkills, isLoading } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
  });

  const installMutation = useMutationWithToast<void, string>({
    mutationFn: async (skillId: string) => {
      await apiRequest("POST", `/api/skills/${skillId}/install`);
    },
    invalidateKeys: [["/api/skills"]],
    successMessage: { title: "Skill installed", description: "This skill is now available for your agents." },
  });

  const filtered = allSkills?.filter(
    (s) => activeCategory === "all" || s.category === activeCategory
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-4 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-2">
        <Puzzle className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Skills</h1>
        <Badge variant="secondary" className="text-xs">ChittyOS Ecosystem</Badge>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Reusable capabilities from the ChittyOS ecosystem that agents can leverage
      </p>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {SKILL_CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            variant={activeCategory === cat.value ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveCategory(cat.value)}
            data-testid={`button-category-${cat.value}`}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="animate-pulse space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((skill) => {
            const IconComponent = iconMap[skill.icon] || Puzzle;
            return (
              <Card
                key={skill.id}
                className="p-5 flex flex-col gap-3 hover-elevate transition-all"
                data-testid={`card-skill-${skill.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: skill.color + "18", color: skill.color }}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">{skill.name}</h3>
                      {skill.language && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: LANG_COLORS[skill.language] || "#888" }}
                          />
                          <span className="text-[10px] text-muted-foreground">{skill.language}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {skill.isEcosystem && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      ChittyOS
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {skill.description}
                </p>

                {skill.capabilities && skill.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {skill.capabilities.slice(0, 3).map((cap, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {cap}
                      </span>
                    ))}
                    {skill.capabilities.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{skill.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-auto pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => installMutation.mutate(skill.id)}
                    disabled={installMutation.isPending}
                    className="flex-1"
                    data-testid={`button-install-skill-${skill.id}`}
                  >
                    {installMutation.isPending ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3 mr-1" />
                    )}
                    Install ({skill.installCount})
                  </Button>
                  {skill.repoUrl && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(skill.repoUrl!, "_blank");
                      }}
                      data-testid={`button-repo-${skill.id}`}
                    >
                      <Github className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No skills in this category</p>
        </div>
      )}
    </div>
  );
}
