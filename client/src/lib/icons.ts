import {
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users, Puzzle,
} from "lucide-react";

export const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  puzzle: Puzzle,
};
