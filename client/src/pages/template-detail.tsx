import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { type Agent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { iconMap } from "@/lib/icons";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import {
  Bot, ArrowLeft, Copy, Loader2
} from "lucide-react";

export default function TemplateDetail() {
  const [, params] = useRoute("/templates/:id");
  const [, navigate] = useLocation();
  const templateId = params?.id;

  const { data: template, isLoading } = useQuery<Agent>({
    queryKey: ["/api/templates", templateId],
    enabled: !!templateId,
  });

  const useTemplateMutation = useMutationWithToast<Agent>({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/templates/${templateId}/use`);
      return res.json();
    },
    invalidateKeys: [["/api/agents"]],
    successMessage: "Agent created from template",
    onSuccess: (result) => navigate(`/agents/${result.id}`),
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <p className="text-muted-foreground">Template not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate("/templates")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to templates
        </Button>
      </div>
    );
  }

  const IconComponent = iconMap[template.icon] || Bot;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/templates")}
        className="mb-4 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <Card className="p-6">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: template.color + "18", color: template.color }}
          >
            <IconComponent className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl font-bold" data-testid="text-template-name">{template.name}</h1>
              <Badge variant="secondary" className="text-xs">{template.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-template-description">
              {template.description}
            </p>
          </div>
        </div>

        {template.prompt && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">What this agent does</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {template.prompt}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-0.5">Trigger</p>
            <p className="text-sm font-medium capitalize">{template.triggerType}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground mb-0.5">Category</p>
            <p className="text-sm font-medium capitalize">{template.category}</p>
          </div>
        </div>

        <Button
          onClick={() => useTemplateMutation.mutate()}
          disabled={useTemplateMutation.isPending}
          className="w-full"
          data-testid="button-use-template"
        >
          {useTemplateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Copy className="w-4 h-4 mr-1" />
          )}
          Use this template
        </Button>
      </Card>
    </div>
  );
}
