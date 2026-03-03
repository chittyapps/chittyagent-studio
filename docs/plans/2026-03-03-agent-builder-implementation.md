# Agent Builder Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the agent builder from a simple form into a tabbed interface with a React Flow workflow canvas, skill attachment UI, trigger configuration, and ChittyOS compliance validation.

**Architecture:** Tabbed interface (Details, Workflow, Skills, Triggers) using shadcn Tabs component. React Flow v12 (`@xyflow/react`) for the drag-and-drop node canvas. All tabs share form state and persist via the existing `PATCH /api/agents/:id` endpoint. New `complianceConfig` JSONB column added to the `agents` table.

**Tech Stack:** React 18, @xyflow/react, shadcn/ui (Tabs, Sheet, Badge, Switch, ScrollArea), Tailwind CSS, Zod, React Hook Form, Drizzle ORM, Vitest

---

### Task 1: Install @xyflow/react dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run: `npm install @xyflow/react`
Expected: Package added to dependencies in package.json

**Step 2: Verify install**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @xyflow/react dependency for workflow canvas"
```

---

### Task 2: Add complianceConfig column to schema and update Zod schemas

**Files:**
- Modify: `shared/schema.ts`
- Test: `tests/shared-schemas.test.ts`

**Step 1: Write failing tests for complianceConfig**

Add to `tests/shared-schemas.test.ts` inside the `createAgentSchema` describe block:

```typescript
it("accepts valid complianceConfig", () => {
  const result = createAgentSchema.safeParse({
    name: "Compliant Agent",
    description: "Has compliance config",
    complianceConfig: {
      level: "recommended",
      enabledRules: ["has-trigger", "has-end-node"],
      customRules: [],
    },
  });
  expect(result.success).toBe(true);
});

it("applies default complianceConfig when omitted", () => {
  const result = createAgentSchema.safeParse({
    name: "Default Agent",
    description: "No compliance config",
  });
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.complianceConfig).toEqual({
      level: "recommended",
      enabledRules: [],
      customRules: [],
    });
  }
});
```

Also add inside the `Schema consistency` describe block, update the `fullData` object to include `complianceConfig`:

```typescript
complianceConfig: { level: "recommended", enabledRules: [], customRules: [] },
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/shared-schemas.test.ts`
Expected: FAIL — `complianceConfig` not recognized by schema

**Step 3: Update shared/schema.ts**

Add the `complianceConfig` column to the `agents` table definition (after the `skillIds` line at line 33):

```typescript
complianceConfig: jsonb("compliance_config").$type<ComplianceConfig>().default({
  level: "recommended",
  enabledRules: [],
  customRules: [],
}),
```

Add the `ComplianceConfig` interface (after `AgentAction` interface, around line 45):

```typescript
export interface ComplianceConfig {
  level: "permissive" | "recommended" | "strict";
  enabledRules: string[];
  customRules: Array<{ id: string; name: string; expression: string }>;
}
```

Add a Zod schema for compliance config (before `createAgentSchema`, around line 63):

```typescript
const complianceConfigSchema = z.object({
  level: z.enum(["permissive", "recommended", "strict"]).default("recommended"),
  enabledRules: z.array(z.string()).default([]),
  customRules: z.array(z.object({
    id: z.string(),
    name: z.string(),
    expression: z.string(),
  })).default([]),
}).default({ level: "recommended", enabledRules: [], customRules: [] });
```

Add `complianceConfig` to `createAgentSchema` (inside the z.object, after `skillIds` line):

```typescript
complianceConfig: complianceConfigSchema,
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/shared-schemas.test.ts`
Expected: ALL PASS

**Step 5: Push schema to database**

Run: `npm run db:push`
Expected: Schema synced successfully

**Step 6: Commit**

```bash
git add shared/schema.ts tests/shared-schemas.test.ts
git commit -m "feat: add complianceConfig field to agents schema"
```

---

### Task 3: Add workflow node type constants and compliance rule constants

**Files:**
- Modify: `client/src/lib/constants.ts`
- Test: `tests/shared-constants.test.ts`

**Step 1: Write failing tests**

Add to `tests/shared-constants.test.ts`:

```typescript
import { WORKFLOW_NODE_TYPES, COMPLIANCE_RULES, COMPLIANCE_LEVELS } from "../client/src/lib/constants";

describe("Workflow constants", () => {
  it("defines all 13 node types", () => {
    expect(WORKFLOW_NODE_TYPES).toHaveLength(13);
  });

  it("each node type has required fields", () => {
    for (const nodeType of WORKFLOW_NODE_TYPES) {
      expect(nodeType).toHaveProperty("type");
      expect(nodeType).toHaveProperty("label");
      expect(nodeType).toHaveProperty("category");
      expect(nodeType).toHaveProperty("icon");
      expect(nodeType).toHaveProperty("color");
    }
  });

  it("has trigger node type", () => {
    expect(WORKFLOW_NODE_TYPES.find(n => n.type === "trigger")).toBeDefined();
  });

  it("has condition node type with multiple handles", () => {
    const condition = WORKFLOW_NODE_TYPES.find(n => n.type === "condition");
    expect(condition).toBeDefined();
    expect(condition?.handles?.outputs).toContain("true");
    expect(condition?.handles?.outputs).toContain("false");
  });
});

describe("Compliance constants", () => {
  it("defines baseline rules", () => {
    expect(COMPLIANCE_RULES.length).toBeGreaterThanOrEqual(6);
  });

  it("each rule has required fields", () => {
    for (const rule of COMPLIANCE_RULES) {
      expect(rule).toHaveProperty("id");
      expect(rule).toHaveProperty("name");
      expect(rule).toHaveProperty("description");
      expect(rule).toHaveProperty("level");
    }
  });

  it("defines 3 compliance levels", () => {
    expect(COMPLIANCE_LEVELS).toHaveLength(3);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/shared-constants.test.ts`
Expected: FAIL — exports not found

**Step 3: Add constants to client/src/lib/constants.ts**

Append to `client/src/lib/constants.ts`:

```typescript
export interface WorkflowNodeType {
  type: string;
  label: string;
  category: "flow" | "action";
  icon: string;
  color: string;
  description: string;
  handles?: {
    inputs: string[];
    outputs: string[];
  };
}

export const WORKFLOW_NODE_TYPES: WorkflowNodeType[] = [
  // Flow Control
  { type: "trigger", label: "Trigger", category: "flow", icon: "zap", color: "#f97316", description: "Entry point — starts the workflow", handles: { inputs: [], outputs: ["default"] } },
  { type: "condition", label: "Condition", category: "flow", icon: "git-branch", color: "#8b5cf6", description: "If/else branch based on expression", handles: { inputs: ["default"], outputs: ["true", "false"] } },
  { type: "loop", label: "Loop", category: "flow", icon: "repeat", color: "#8b5cf6", description: "Iterate over a collection", handles: { inputs: ["default"], outputs: ["each", "done"] } },
  { type: "delay", label: "Delay", category: "flow", icon: "clock", color: "#64748b", description: "Wait for a duration or condition", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "end", label: "End", category: "flow", icon: "circle-stop", color: "#ef4444", description: "Terminal node — marks completion", handles: { inputs: ["default"], outputs: [] } },
  // Actions
  { type: "llmAction", label: "AI / LLM", category: "action", icon: "sparkles", color: "#06b6d4", description: "Send prompt to an LLM", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "skillAction", label: "Skill", category: "action", icon: "puzzle", color: "#34a853", description: "Execute an ecosystem skill", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "httpRequest", label: "HTTP Request", category: "action", icon: "globe", color: "#3b82f6", description: "Make an external API call", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "email", label: "Email", category: "action", icon: "mail", color: "#ea4335", description: "Send an email notification", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "codeScript", label: "Code / Script", category: "action", icon: "code", color: "#a855f7", description: "Run custom JavaScript", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "dataTransform", label: "Data Transform", category: "action", icon: "shuffle", color: "#14b8a6", description: "Map, filter, or reshape data", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "subWorkflow", label: "Sub-workflow", category: "action", icon: "layers", color: "#f59e0b", description: "Run another agent as a nested flow", handles: { inputs: ["default"], outputs: ["default"] } },
  { type: "notification", label: "Notification", category: "action", icon: "bell", color: "#ec4899", description: "Send alert via channel", handles: { inputs: ["default"], outputs: ["default"] } },
];

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  level: "permissive" | "recommended" | "strict";
}

export const COMPLIANCE_RULES: ComplianceRule[] = [
  // Permissive (graph validity)
  { id: "has-trigger", name: "Has trigger node", description: "Workflow must have exactly one trigger node", level: "permissive" },
  { id: "no-orphans", name: "No orphan nodes", description: "All nodes must be connected to the graph", level: "permissive" },
  // Recommended (ChittyOS baseline)
  { id: "has-end-node", name: "Ends with End node", description: "All paths must terminate at an End node", level: "recommended" },
  { id: "skills-available", name: "Skills available", description: "Referenced skills must be installed in ChittyOS", level: "recommended" },
  { id: "http-error-handling", name: "HTTP error handling", description: "HTTP and external action nodes must have error handling", level: "recommended" },
  { id: "data-sanitization", name: "Data sanitization", description: "Sensitive data nodes must sanitize output", level: "recommended" },
  // Strict
  { id: "failure-notification", name: "Failure notification", description: "Must include a notification on failure path", level: "strict" },
  { id: "max-depth", name: "Max workflow depth", description: "Workflow depth must not exceed configured limit", level: "strict" },
  { id: "no-code-nodes", name: "No code/script nodes", description: "Code/Script nodes are not allowed", level: "strict" },
  { id: "llm-model-specified", name: "LLM model specified", description: "All LLM actions must specify a model", level: "strict" },
];

export const COMPLIANCE_LEVELS = [
  { value: "permissive", label: "Permissive", description: "Only critical graph validity checks" },
  { value: "recommended", label: "Recommended", description: "Baseline ChittyOS rules" },
  { value: "strict", label: "Strict", description: "All rules enforced" },
] as const;
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/shared-constants.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add client/src/lib/constants.ts tests/shared-constants.test.ts
git commit -m "feat: add workflow node types and compliance rule constants"
```

---

### Task 4: Create workflow node components for React Flow

**Files:**
- Create: `client/src/components/workflow/workflow-node.tsx`
- Create: `client/src/components/workflow/node-palette.tsx`

**Step 1: Create the custom workflow node component**

Create `client/src/components/workflow/workflow-node.tsx`:

```tsx
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { WORKFLOW_NODE_TYPES } from "@/lib/constants";
import { iconMap } from "@/lib/icons";
import { Badge } from "@/components/ui/badge";

interface WorkflowNodeData {
  label: string;
  type: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as WorkflowNodeData;
  const nodeDef = WORKFLOW_NODE_TYPES.find((n) => n.type === nodeData.type);
  const IconComponent = iconMap[nodeDef?.icon || "bot"];

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-card shadow-sm min-w-[160px] transition-colors ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      {nodeDef?.handles?.inputs.map((handle) => (
        <Handle
          key={`in-${handle}`}
          type="target"
          position={Position.Top}
          id={handle}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      ))}

      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: (nodeDef?.color || "#64748b") + "18",
            color: nodeDef?.color || "#64748b",
          }}
        >
          {IconComponent ? <IconComponent className="w-4 h-4" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{nodeData.label}</div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {nodeDef?.category || "action"}
          </Badge>
        </div>
      </div>

      {nodeDef?.handles?.outputs.map((handle, i) => (
        <Handle
          key={`out-${handle}`}
          type="source"
          position={Position.Bottom}
          id={handle}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
          style={{
            left: nodeDef.handles!.outputs.length > 1
              ? `${((i + 1) / (nodeDef.handles!.outputs.length + 1)) * 100}%`
              : "50%",
          }}
        />
      ))}
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
```

**Step 2: Create the node palette (drag source)**

Create `client/src/components/workflow/node-palette.tsx`:

```tsx
import { WORKFLOW_NODE_TYPES } from "@/lib/constants";
import { iconMap } from "@/lib/icons";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NodePalette() {
  const flowNodes = WORKFLOW_NODE_TYPES.filter((n) => n.category === "flow");
  const actionNodes = WORKFLOW_NODE_TYPES.filter((n) => n.category === "action");

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Flow Control
          </h4>
          <div className="space-y-1">
            {flowNodes.map((node) => {
              const Icon = iconMap[node.icon];
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-card cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors active:cursor-grabbing"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: node.color + "18", color: node.color }}
                  >
                    {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{node.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Actions
          </h4>
          <div className="space-y-1">
            {actionNodes.map((node) => {
              const Icon = iconMap[node.icon];
              return (
                <div
                  key={node.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  className="flex items-center gap-2 p-2 rounded-md border border-border bg-card cursor-grab hover:border-primary/50 hover:bg-accent/50 transition-colors active:cursor-grabbing"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: node.color + "18", color: node.color }}
                  >
                    {Icon ? <Icon className="w-3.5 h-3.5" /> : null}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{node.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
```

**Step 3: Add missing icons to the icon map**

Modify `client/src/lib/icons.ts` to add the new icons needed by workflow nodes:

```typescript
import {
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users, Puzzle,
  GitBranch, Repeat, Clock, CircleStop, Sparkles,
  Globe, Code, Shuffle, Layers, Bell,
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
  "git-branch": GitBranch,
  repeat: Repeat,
  clock: Clock,
  "circle-stop": CircleStop,
  sparkles: Sparkles,
  globe: Globe,
  code: Code,
  shuffle: Shuffle,
  layers: Layers,
  bell: Bell,
};
```

**Step 4: Verify build**

Run: `npm run check`
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add client/src/components/workflow/workflow-node.tsx client/src/components/workflow/node-palette.tsx client/src/lib/icons.ts
git commit -m "feat: add workflow node component and drag-and-drop palette"
```

---

### Task 5: Create the workflow canvas component

**Files:**
- Create: `client/src/components/workflow/workflow-canvas.tsx`

**Step 1: Create the canvas component**

Create `client/src/components/workflow/workflow-canvas.tsx`:

```tsx
import { useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./workflow-node";
import { NodePalette } from "./node-palette";
import { WORKFLOW_NODE_TYPES } from "@/lib/constants";

const nodeTypes = {
  workflowNode: WorkflowNode,
};

interface WorkflowData {
  nodes: Node[];
  edges: Edge[];
}

interface WorkflowCanvasProps {
  value: WorkflowData;
  onChange: (data: WorkflowData) => void;
}

let nodeId = 0;
function getNextId() {
  return `node_${++nodeId}_${Date.now()}`;
}

function WorkflowCanvasInner({ value, onChange }: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    value.nodes.map((n) => ({ ...n, type: "workflowNode" }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(value.edges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const newEdges = addEdge(
          { ...params, animated: true, style: { strokeWidth: 2 } },
          eds
        );
        onChange({ nodes, edges: newEdges });
        return newEdges;
      });
    },
    [nodes, onChange, setEdges]
  );

  const onNodesChangeWrapped = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      // Sync after state update via setTimeout
      setTimeout(() => {
        onChange({ nodes, edges });
      }, 0);
    },
    [nodes, edges, onChange, onNodesChange]
  );

  const onEdgesChangeWrapped = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setTimeout(() => {
        onChange({ nodes, edges });
      }, 0);
    },
    [nodes, edges, onChange, onEdgesChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) return;

      const nodeDef = WORKFLOW_NODE_TYPES.find((n) => n.type === type);
      if (!nodeDef) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left - 80,
        y: event.clientY - bounds.top - 20,
      };

      const newNode: Node = {
        id: getNextId(),
        type: "workflowNode",
        position,
        data: {
          label: nodeDef.label,
          type: nodeDef.type,
          config: {},
        },
      };

      setNodes((nds) => {
        const updated = [...nds, newNode];
        onChange({ nodes: updated, edges });
        return updated;
      });
    },
    [edges, onChange, setNodes]
  );

  return (
    <div className="flex h-[500px] border rounded-lg overflow-hidden">
      <div className="w-48 border-r bg-muted/30 flex-shrink-0">
        <NodePalette />
      </div>
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeWrapped}
          onEdgesChange={onEdgesChangeWrapped}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          className="bg-background"
        >
          <Background gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bg-muted/50"
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
```

**Step 2: Verify build**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add client/src/components/workflow/workflow-canvas.tsx
git commit -m "feat: add React Flow workflow canvas with drag-and-drop"
```

---

### Task 6: Create the skills picker component

**Files:**
- Create: `client/src/components/skills-picker.tsx`

**Step 1: Create the component**

Create `client/src/components/skills-picker.tsx`:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Skill } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Check } from "lucide-react";
import { iconMap } from "@/lib/icons";
import { SKILL_CATEGORIES } from "@/lib/constants";

interface SkillsPickerProps {
  value: string[];
  onChange: (skillIds: string[]) => void;
}

export function SkillsPicker({ value, onChange }: SkillsPickerProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
  });

  const filtered = skills.filter((skill) => {
    const matchesSearch =
      !search ||
      skill.name.toLowerCase().includes(search.toLowerCase()) ||
      skill.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || skill.category === category;
    return matchesSearch && matchesCategory;
  });

  const attachedSkills = skills.filter((s) => value.includes(s.id));

  const toggleSkill = (skillId: string) => {
    if (value.includes(skillId)) {
      onChange(value.filter((id) => id !== skillId));
    } else {
      onChange([...value, skillId]);
    }
  };

  return (
    <div className="space-y-4">
      {attachedSkills.length > 0 && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="text-sm font-medium mb-2">
            {attachedSkills.length} skill{attachedSkills.length !== 1 ? "s" : ""} attached
          </div>
          <div className="flex flex-wrap gap-1.5">
            {attachedSkills.map((skill) => (
              <Badge key={skill.id} variant="secondary" className="text-xs">
                {skill.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SKILL_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              category === cat.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((skill) => {
          const isAttached = value.includes(skill.id);
          const Icon = iconMap[skill.icon] || iconMap["puzzle"];
          return (
            <button
              key={skill.id}
              type="button"
              onClick={() => toggleSkill(skill.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                isAttached
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-accent/50"
              }`}
            >
              <div
                className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: skill.color + "18",
                  color: skill.color,
                }}
              >
                {Icon ? <Icon className="w-4 h-4" /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{skill.name}</span>
                  {isAttached && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {skill.description}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {skill.category}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {skill.installCount} installs
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No skills found matching your criteria.
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add client/src/components/skills-picker.tsx
git commit -m "feat: add skills picker component with search and category filtering"
```

---

### Task 7: Create the trigger configuration component

**Files:**
- Create: `client/src/components/trigger-config.tsx`

**Step 1: Create the component**

Create `client/src/components/trigger-config.tsx`:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, Clock, Mail, Globe } from "lucide-react";

const triggerCards = [
  { value: "manual", label: "Manual", description: "Run on demand", icon: Zap },
  { value: "schedule", label: "Scheduled", description: "Run on a schedule", icon: Clock },
  { value: "email", label: "Email", description: "When an email arrives", icon: Mail },
  { value: "webhook", label: "Webhook", description: "On external event", icon: Globe },
];

interface TriggerConfigProps {
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  onTypeChange: (type: string) => void;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export function TriggerConfig({
  triggerType,
  triggerConfig,
  onTypeChange,
  onConfigChange,
}: TriggerConfigProps) {
  const updateConfig = (key: string, value: unknown) => {
    onConfigChange({ ...triggerConfig, [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {triggerCards.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onTypeChange(t.value)}
            className={`p-4 rounded-lg border-2 text-center transition-colors ${
              triggerType === t.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <t.icon
              className={`w-6 h-6 mx-auto mb-2 ${
                triggerType === t.value ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
          </button>
        ))}
      </div>

      <div className="border rounded-lg p-4">
        {triggerType === "manual" && (
          <p className="text-sm text-muted-foreground">
            No additional configuration needed. This agent will be run manually via the dashboard.
          </p>
        )}

        {triggerType === "schedule" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Schedule Configuration</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Minute</Label>
                <Select
                  value={String(triggerConfig.minute ?? "*")}
                  onValueChange={(v) => updateConfig("minute", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Every</SelectItem>
                    <SelectItem value="0">:00</SelectItem>
                    <SelectItem value="15">:15</SelectItem>
                    <SelectItem value="30">:30</SelectItem>
                    <SelectItem value="45">:45</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Hour</Label>
                <Select
                  value={String(triggerConfig.hour ?? "*")}
                  onValueChange={(v) => updateConfig("hour", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Every</SelectItem>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i.toString().padStart(2, "0")}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Day</Label>
                <Select
                  value={String(triggerConfig.day ?? "*")}
                  onValueChange={(v) => updateConfig("day", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Every</SelectItem>
                    {Array.from({ length: 31 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Month</Label>
                <Select
                  value={String(triggerConfig.month ?? "*")}
                  onValueChange={(v) => updateConfig("month", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Every</SelectItem>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Weekday</Label>
                <Select
                  value={String(triggerConfig.weekday ?? "*")}
                  onValueChange={(v) => updateConfig("weekday", v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">Every</SelectItem>
                    {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cron: {triggerConfig.minute ?? "*"} {triggerConfig.hour ?? "*"} {triggerConfig.day ?? "*"} {triggerConfig.month ?? "*"} {triggerConfig.weekday ?? "*"}
            </p>
          </div>
        )}

        {triggerType === "email" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Email Trigger Filters</h4>
            <div>
              <Label className="text-xs">From address (contains)</Label>
              <Input
                placeholder="e.g. @company.com"
                value={String(triggerConfig.fromFilter ?? "")}
                onChange={(e) => updateConfig("fromFilter", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Subject keyword</Label>
              <Input
                placeholder="e.g. urgent, invoice"
                value={String(triggerConfig.subjectFilter ?? "")}
                onChange={(e) => updateConfig("subjectFilter", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Body keyword</Label>
              <Input
                placeholder="e.g. action required"
                value={String(triggerConfig.bodyFilter ?? "")}
                onChange={(e) => updateConfig("bodyFilter", e.target.value)}
              />
            </div>
          </div>
        )}

        {triggerType === "webhook" && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Webhook Configuration</h4>
            <div>
              <Label className="text-xs">Webhook URL</Label>
              <Input
                value={String(triggerConfig.webhookUrl ?? "https://api.chittyos.com/webhooks/agent/...")}
                readOnly
                className="bg-muted font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This URL will be auto-generated when the agent is activated.
              </p>
            </div>
            <div>
              <Label className="text-xs">Secret header (optional)</Label>
              <Input
                placeholder="X-Webhook-Secret"
                value={String(triggerConfig.secretHeader ?? "")}
                onChange={(e) => updateConfig("secretHeader", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add client/src/components/trigger-config.tsx
git commit -m "feat: add trigger configuration component with type-specific forms"
```

---

### Task 8: Create the compliance validation panel

**Files:**
- Create: `client/src/components/workflow/compliance-panel.tsx`

**Step 1: Create the component**

Create `client/src/components/workflow/compliance-panel.tsx`:

```tsx
import { useState } from "react";
import { type ComplianceConfig } from "@shared/schema";
import { COMPLIANCE_RULES, COMPLIANCE_LEVELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Play } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";

interface CompliancePanelProps {
  complianceConfig: ComplianceConfig;
  onConfigChange: (config: ComplianceConfig) => void;
  nodes: Node[];
  edges: Edge[];
}

interface ValidationResult {
  ruleId: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

function runValidation(
  nodes: Node[],
  edges: Edge[],
  config: ComplianceConfig
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const activeRules = COMPLIANCE_RULES.filter((rule) => {
    const levelOrder = ["permissive", "recommended", "strict"];
    const configLevel = levelOrder.indexOf(config.level);
    const ruleLevel = levelOrder.indexOf(rule.level);
    return ruleLevel <= configLevel || config.enabledRules.includes(rule.id);
  });

  for (const rule of activeRules) {
    switch (rule.id) {
      case "has-trigger": {
        const triggers = nodes.filter((n: any) => n.data?.type === "trigger");
        results.push({
          ruleId: rule.id,
          status: triggers.length === 1 ? "pass" : "fail",
          message: triggers.length === 1
            ? "Workflow has one trigger node"
            : triggers.length === 0
            ? "No trigger node found"
            : `Found ${triggers.length} trigger nodes (expected 1)`,
        });
        break;
      }
      case "no-orphans": {
        const connectedIds = new Set<string>();
        edges.forEach((e) => {
          connectedIds.add(e.source);
          connectedIds.add(e.target);
        });
        const orphans = nodes.filter((n) => !connectedIds.has(n.id) && nodes.length > 1);
        results.push({
          ruleId: rule.id,
          status: orphans.length === 0 ? "pass" : "fail",
          message: orphans.length === 0
            ? "All nodes are connected"
            : `${orphans.length} orphan node(s) found`,
        });
        break;
      }
      case "has-end-node": {
        const endNodes = nodes.filter((n: any) => n.data?.type === "end");
        results.push({
          ruleId: rule.id,
          status: endNodes.length > 0 ? "pass" : "warn",
          message: endNodes.length > 0
            ? `${endNodes.length} end node(s) found`
            : "No end node — workflow may not terminate cleanly",
        });
        break;
      }
      default: {
        results.push({
          ruleId: rule.id,
          status: "pass",
          message: `${rule.name} — not yet auto-validated`,
        });
      }
    }
  }

  return results;
}

export function CompliancePanel({
  complianceConfig,
  onConfigChange,
  nodes,
  edges,
}: CompliancePanelProps) {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleValidate = () => {
    setResults(runValidation(nodes, edges, complianceConfig));
    setHasRun(true);
  };

  const passCount = results.filter((r) => r.status === "pass").length;
  const failCount = results.filter((r) => r.status === "fail").length;
  const warnCount = results.filter((r) => r.status === "warn").length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          Validate
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[480px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Compliance & Validation
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Level selector */}
          <div>
            <h4 className="text-sm font-medium mb-2">Compliance Level</h4>
            <div className="grid grid-cols-3 gap-2">
              {COMPLIANCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() =>
                    onConfigChange({ ...complianceConfig, level: level.value })
                  }
                  className={`p-2 rounded-md border text-center transition-colors ${
                    complianceConfig.level === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-xs font-medium">{level.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {level.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rules list */}
          <div>
            <h4 className="text-sm font-medium mb-2">Rules</h4>
            <div className="space-y-2">
              {COMPLIANCE_RULES.map((rule) => {
                const isEnabled = (() => {
                  const levelOrder = ["permissive", "recommended", "strict"];
                  const configLevel = levelOrder.indexOf(complianceConfig.level);
                  const ruleLevel = levelOrder.indexOf(rule.level);
                  return ruleLevel <= configLevel || complianceConfig.enabledRules.includes(rule.id);
                })();

                const result = results.find((r) => r.ruleId === rule.id);

                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-2 rounded-md border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {hasRun && result ? (
                        result.status === "pass" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : result.status === "fail" ? (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        )
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{rule.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {hasRun && result ? result.message : rule.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {rule.level}
                      </Badge>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          const newEnabled = checked
                            ? [...complianceConfig.enabledRules, rule.id]
                            : complianceConfig.enabledRules.filter((id) => id !== rule.id);
                          onConfigChange({ ...complianceConfig, enabledRules: newEnabled });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Validate button */}
          <Button onClick={handleValidate} className="w-full gap-1.5">
            <Play className="w-4 h-4" />
            Run Validation
          </Button>

          {/* Summary */}
          {hasRun && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {passCount} passed
              </div>
              <div className="flex items-center gap-1 text-xs">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                {failCount} failed
              </div>
              <div className="flex items-center gap-1 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {warnCount} warnings
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Verify build**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add client/src/components/workflow/compliance-panel.tsx
git commit -m "feat: add compliance validation panel with configurable rules"
```

---

### Task 9: Rewrite agent builder as tabbed interface

**Files:**
- Modify: `client/src/pages/agent-builder.tsx`

**Step 1: Rewrite the agent builder page**

Replace the entire contents of `client/src/pages/agent-builder.tsx` with the new tabbed layout. This integrates:

- **Details tab** — the existing form fields (name, description, prompt, icon, color, category)
- **Workflow tab** — WorkflowCanvas component + CompliancePanel
- **Skills tab** — SkillsPicker component
- **Triggers tab** — TriggerConfig component

Key changes:
- Wrap everything in `Tabs` from shadcn/ui
- Expand form schema to include `skillIds`, `triggerConfig`, `actions` (workflow data), and `complianceConfig`
- The `actions` field now stores `{ nodes: [], edges: [] }` instead of the old `AgentAction[]` format
- Single "Save" button outside the tabs that persists all tab data

Full replacement for `client/src/pages/agent-builder.tsx`:

```tsx
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Agent, createAgentSchema } from "@shared/schema";
import { useMutationWithToast } from "@/hooks/use-mutation-with-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Loader2, Sparkles,
  Bot, Mail, FileText, Calendar, MessageSquare, Search,
  Zap, Shield, BarChart3, Users,
  Workflow, Puzzle, Radio,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { WorkflowCanvas } from "@/components/workflow/workflow-canvas";
import { CompliancePanel } from "@/components/workflow/compliance-panel";
import { SkillsPicker } from "@/components/skills-picker";
import { TriggerConfig } from "@/components/trigger-config";
import { useState } from "react";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger as SelectTrig,
  SelectValue,
} from "@/components/ui/select";

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
```

**Step 2: Verify build**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Run all tests**

Run: `npm run test`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add client/src/pages/agent-builder.tsx
git commit -m "feat: rewrite agent builder as tabbed interface with workflow, skills, triggers"
```

---

### Task 10: Run full verification

**Step 1: Run TypeScript check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 2: Run all tests**

Run: `npm run test`
Expected: ALL PASS (89+ tests)

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Final commit if any cleanup needed**

```bash
git status
```

If there are remaining changes, commit them:

```bash
git add -A
git commit -m "chore: clean up after agent builder enhancement"
```
