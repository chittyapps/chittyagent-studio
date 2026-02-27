import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export function EmptyState() {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center" data-testid="empty-state">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-semibold mb-2">No agents yet</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Create your first AI agent to automate workflows, manage emails, generate reports, and more.
      </p>
      <Button onClick={() => navigate("/agents/new")} data-testid="button-create-first-agent">
        <Plus className="w-4 h-4 mr-1" />
        Create your first agent
      </Button>
    </div>
  );
}
