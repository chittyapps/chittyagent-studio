import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Agent } from "@shared/schema";
import { useLocation } from "wouter";
import {
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users, ArrowRight
} from "lucide-react";

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

const categoryLabels: Record<string, string> = {
  email: "Email",
  productivity: "Productivity",
  communication: "Communication",
  data: "Data & Analytics",
  general: "General",
  hr: "HR",
  sales: "Sales",
  support: "Support",
};

export function TemplateCard({ template }: { template: Agent }) {
  const [, navigate] = useLocation();
  const IconComponent = iconMap[template.icon] || Bot;

  return (
    <Card
      className="group cursor-pointer p-4 hover-elevate transition-all duration-200"
      onClick={() => navigate(`/templates/${template.id}`)}
      data-testid={`card-template-${template.id}`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: template.color + "18", color: template.color }}
          >
            <IconComponent className="w-5 h-5" />
          </div>
          <Badge variant="secondary" className="text-[10px] shrink-0">
            {categoryLabels[template.category] || template.category}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        </div>
        <div className="flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Use template <ArrowRight className="w-3 h-3 ml-1" />
        </div>
      </div>
    </Card>
  );
}

export function TemplateCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-md bg-muted animate-pulse" />
          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-3 bg-muted rounded animate-pulse w-full" />
        </div>
      </div>
    </Card>
  );
}
