import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type Agent } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TemplateCardSkeleton } from "@/components/template-card";
import { iconMap } from "@/lib/icons";
import { TEMPLATE_CATEGORIES } from "@/lib/constants";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import {
  ArrowLeft, Copy, LayoutGrid, Bot, Loader2
} from "lucide-react";
import { useState } from "react";

export default function Templates() {
  const [, navigate] = useLocation();
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: templates, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/templates"],
  });

  const useTemplateMutation = useMutationWithToast<Agent, string>({
    mutationFn: async (templateId: string) => {
      const res = await apiRequest("POST", `/api/templates/${templateId}/use`);
      return res.json();
    },
    invalidateKeys: [["/api/agents"]],
    successMessage: "Agent created from template",
    onSuccess: (result) => navigate(`/agents/${result.id}`),
  });

  const filtered = templates?.filter(
    (t) => activeCategory === "all" || t.category === activeCategory
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
        <LayoutGrid className="w-5 h-5 text-primary" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Template Library</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Start with a pre-built agent and customize it to your needs
      </p>

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {TEMPLATE_CATEGORIES.map((cat) => (
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
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((template) => {
            const IconComponent = iconMap[template.icon] || Bot;
            return (
              <Card
                key={template.id}
                className="p-5 flex flex-col gap-3 hover-elevate transition-all"
                data-testid={`card-template-${template.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: template.color + "18", color: template.color }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {template.category}
                  </Badge>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {template.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => useTemplateMutation.mutate(template.id)}
                  disabled={useTemplateMutation.isPending}
                  data-testid={`button-use-template-${template.id}`}
                >
                  {useTemplateMutation.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Copy className="w-3 h-3 mr-1" />
                  )}
                  Use template
                </Button>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No templates in this category</p>
        </div>
      )}
    </div>
  );
}
