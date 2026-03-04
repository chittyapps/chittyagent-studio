import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Agent, createAgentSchema } from "@shared/schema";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger as SelectTrig,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, Sparkles,
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users,
  Workflow, Puzzle, Radio,
  Wand2, ChevronRight,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { CompliancePanel } from "@/components/workflow/compliance-panel";
import { SkillsPicker } from "@/components/skills-picker";
import { TriggerConfig } from "@/components/trigger-config";
import type { Node, Edge } from "@xyflow/react";

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
  category: true,
  skillIds: true,
  triggerType: true,
  triggerConfig: true,
  complianceConfig: true,
}).extend({
  status: z.string().default("draft"),
  actions: z.any().default({ nodes: [], edges: [] }),
});

type FormValues = z.infer<typeof formSchema>;

export default function AgentBuilder() {
  const [, navigate] = useLocation();
  const [, editParams] = useRoute("/agents/:id/edit");
  const isEditing = !!editParams?.id;
  const agentId = editParams?.id;
  const [activeTab, setActiveTab] = useState("details");

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
      triggerConfig: {},
      category: "general",
      status: "draft",
      skillIds: [],
      actions: { nodes: [], edges: [] },
      complianceConfig: { level: "recommended", enabledRules: [], customRules: [] },
    },
    values: existingAgent
      ? {
          name: existingAgent.name,
          description: existingAgent.description,
          prompt: existingAgent.prompt,
          icon: existingAgent.icon,
          color: existingAgent.color,
          triggerType: existingAgent.triggerType,
          triggerConfig: (existingAgent.triggerConfig as Record<string, unknown>) || {},
          category: existingAgent.category,
          status: existingAgent.status,
          skillIds: existingAgent.skillIds || [],
          actions: (existingAgent.actions as any) || { nodes: [], edges: [] },
          complianceConfig: (existingAgent as any).complianceConfig || {
            level: "recommended",
            enabledRules: [],
            customRules: [],
          },
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
  const workflowData = form.watch("actions") || { nodes: [], edges: [] };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
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
            {isEditing ? "Update your agent configuration" : "Build your agent workflow"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" className="gap-1.5">
                <Bot className="w-3.5 h-3.5" /> Details
              </TabsTrigger>
              <TabsTrigger value="workflow" className="gap-1.5">
                <Workflow className="w-3.5 h-3.5" /> Workflow
              </TabsTrigger>
              <TabsTrigger value="skills" className="gap-1.5">
                <Puzzle className="w-3.5 h-3.5" /> Skills
              </TabsTrigger>
              <TabsTrigger value="triggers" className="gap-1.5">
                <Radio className="w-3.5 h-3.5" /> Triggers
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              {!isEditing && (
                <Link href="/agents/recommend">
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
                    <Wand2 className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Get AI recommendation</p>
                      <p className="text-xs text-muted-foreground">
                        Describe what you need and let our AI generate a complete agent configuration
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              )}
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
                        placeholder="Tell the agent what to do in natural language..."
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

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrig data-testid="select-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrig>
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
            </TabsContent>

            {/* Workflow Tab */}
            <TabsContent value="workflow" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Workflow Canvas</h3>
                  <p className="text-xs text-muted-foreground">
                    Drag nodes from the palette and connect them to build your workflow.
                  </p>
                </div>
                <CompliancePanel
                  complianceConfig={form.watch("complianceConfig") || { level: "recommended", enabledRules: [], customRules: [] }}
                  onConfigChange={(config) => form.setValue("complianceConfig", config)}
                  nodes={(workflowData.nodes || []) as Node[]}
                  edges={(workflowData.edges || []) as Edge[]}
                />
              </div>
              <WorkflowCanvas
                value={workflowData}
                onChange={(data) => form.setValue("actions", data)}
              />
            </TabsContent>

            {/* Skills Tab */}
            <TabsContent value="skills">
              <div className="mb-4">
                <h3 className="text-sm font-medium">Attached Skills</h3>
                <p className="text-xs text-muted-foreground">
                  Attach ecosystem skills to use them as Skill Action nodes in your workflow.
                </p>
              </div>
              <SkillsPicker
                value={form.watch("skillIds") || []}
                onChange={(ids) => form.setValue("skillIds", ids)}
              />
            </TabsContent>

            {/* Triggers Tab */}
            <TabsContent value="triggers">
              <div className="mb-4">
                <h3 className="text-sm font-medium">Trigger Configuration</h3>
                <p className="text-xs text-muted-foreground">
                  Choose how this agent gets started and configure trigger-specific settings.
                </p>
              </div>
              <TriggerConfig
                triggerType={form.watch("triggerType") || "manual"}
                triggerConfig={(form.watch("triggerConfig") as Record<string, unknown>) || {}}
                onTypeChange={(type) => form.setValue("triggerType", type)}
                onConfigChange={(config) => form.setValue("triggerConfig", config)}
              />
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3 pt-6 border-t mt-6">
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
