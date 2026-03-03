import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Agent, createAgentSchema } from "@shared/schema";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Sparkles,
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";

const iconOptions = [
  { value: "bot", label: "Bot", icon: Bot },
  { value: "mail", label: "Email", icon: Mail },
  { value: "file", label: "Document", icon: FileText },
  { value: "calendar", label: "Calendar", icon: Calendar },
  { value: "message", label: "Chat", icon: MessageSquare },
  { value: "search", label: "Search", icon: Search },
  { value: "zap", label: "Automation", icon: Zap },
  { value: "shield", label: "Security", icon: Shield },
  { value: "chart", label: "Analytics", icon: BarChart3 },
  { value: "users", label: "Team", icon: Users },
];

const colorOptions = [
  "#4285f4", "#ea4335", "#fbbc04", "#34a853",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const triggerOptions = [
  { value: "manual", label: "Manual - Run on demand" },
  { value: "schedule", label: "Scheduled - Run on a schedule" },
  { value: "email", label: "Email - When an email arrives" },
  { value: "webhook", label: "Webhook - On external event" },
];

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "email", label: "Email" },
  { value: "productivity", label: "Productivity" },
  { value: "communication", label: "Communication" },
  { value: "data", label: "Data & Analytics" },
  { value: "hr", label: "HR" },
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
];

const formSchema = createAgentSchema.pick({
  name: true,
  description: true,
  prompt: true,
  icon: true,
  color: true,
  triggerType: true,
  category: true,
}).extend({
  status: z.string().default("draft"),
});

type FormValues = z.infer<typeof formSchema>;

export default function AgentBuilder() {
  const [, navigate] = useLocation();
  const [, editParams] = useRoute("/agents/:id/edit");
  const isEditing = !!editParams?.id;
  const agentId = editParams?.id;

  const { data: existingAgent } = useQuery<Agent>({
    queryKey: ["/api/agents", agentId],
    enabled: isEditing,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      prompt: "",
      icon: "bot",
      color: "#4285f4",
      triggerType: "manual",
      category: "general",
      status: "draft",
    },
    values: existingAgent
      ? {
          name: existingAgent.name,
          description: existingAgent.description,
          prompt: existingAgent.prompt,
          icon: existingAgent.icon,
          color: existingAgent.color,
          triggerType: existingAgent.triggerType,
          category: existingAgent.category,
          status: existingAgent.status,
        }
      : undefined,
  });

  const saveMutation = useMutationWithToast<Agent, FormValues>({
    mutationFn: async (data: FormValues) => {
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/agents/${agentId}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/agents", data);
      return res.json();
    },
    invalidateKeys: isEditing
      ? [["/api/agents"], ["/api/agents", agentId]]
      : [["/api/agents"]],
    successMessage: isEditing ? "Agent updated" : "Agent created",
    onSuccess: (result) => navigate(`/agents/${result.id}`),
  });

  const selectedIcon = iconOptions.find((o) => o.value === form.watch("icon"));
  const selectedColor = form.watch("color");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(isEditing ? `/agents/${agentId}` : "/")}
        className="mb-4 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: selectedColor + "18", color: selectedColor }}
        >
          {selectedIcon ? <selectedIcon.icon className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </div>
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">
            {isEditing ? "Edit agent" : "Create agent"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditing ? "Update your agent configuration" : "Describe what your agent should do"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Email Summarizer" {...field} data-testid="input-agent-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what this agent does..."
                    className="resize-none"
                    rows={3}
                    {...field}
                    data-testid="input-agent-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="prompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Agent instructions
                  </span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Tell the agent what to do in natural language. For example: 'When I receive an email from a customer, summarize the key points and draft a reply.'"
                    className="resize-none min-h-[120px]"
                    rows={5}
                    {...field}
                    data-testid="input-agent-prompt"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {iconOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`w-9 h-9 rounded-md flex items-center justify-center border transition-colors ${
                          field.value === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-transparent bg-muted/50"
                        }`}
                        data-testid={`button-icon-${opt.value}`}
                      >
                        <opt.icon className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => field.onChange(c)}
                        className={`w-9 h-9 rounded-md border-2 transition-colors ${
                          field.value === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        data-testid={`button-color-${c}`}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="triggerType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trigger</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-trigger-type">
                        <SelectValue placeholder="Select trigger" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {triggerOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              data-testid="button-save-agent"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1" />
              )}
              {isEditing ? "Save changes" : "Create agent"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(isEditing ? `/agents/${agentId}` : "/")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
