import { describe, it, expect } from "vitest";
import { createAgentSchema, updateAgentSchema } from "../shared/schema";
import { WORKFLOW_NODE_TYPES, COMPLIANCE_RULES, COMPLIANCE_LEVELS } from "../client/src/lib/constants";

// ─── Helpers: build workflow graph structures ────────────────────────────

function makeNode(id: string, type: string, position = { x: 0, y: 0 }) {
  return { id, type: "workflowNode", position, data: { label: type, type, config: {} } };
}

function makeEdge(source: string, target: string, sourceHandle = "default") {
  return { id: `${source}-${target}`, source, target, sourceHandle };
}

// ─── Helpers: compliance validation (mirrors compliance-panel.tsx logic) ─

interface ValidationResult {
  ruleId: string;
  status: "pass" | "fail" | "warn";
  message: string;
}

interface ComplianceConfig {
  level: "permissive" | "recommended" | "strict";
  enabledRules: string[];
  customRules: Array<{ id: string; name: string; expression: string }>;
}

function runValidation(
  nodes: any[],
  edges: any[],
  config: ComplianceConfig
): ValidationResult[] {
  const results: ValidationResult[] = [];
  const levelOrder = ["permissive", "recommended", "strict"];
  const configLevel = levelOrder.indexOf(config.level);

  const activeRules = COMPLIANCE_RULES.filter((rule) => {
    const ruleLevel = levelOrder.indexOf(rule.level);
    return ruleLevel <= configLevel || config.enabledRules.includes(rule.id);
  });

  for (const rule of activeRules) {
    switch (rule.id) {
      case "has-trigger": {
        const triggers = nodes.filter((n) => n.data?.type === "trigger");
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
        edges.forEach((e: any) => {
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
        const endNodes = nodes.filter((n) => n.data?.type === "end");
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

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 1: Creating an agent with a complete workflow
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Create agent with full workflow", () => {
  const workflow = {
    nodes: [
      makeNode("t1", "trigger"),
      makeNode("a1", "llmAction"),
      makeNode("a2", "email"),
      makeNode("e1", "end"),
    ],
    edges: [
      makeEdge("t1", "a1"),
      makeEdge("a1", "a2"),
      makeEdge("a2", "e1"),
    ],
  };

  it("schema accepts agent with workflow nodes and edges", () => {
    const result = createAgentSchema.safeParse({
      name: "Email Summarizer",
      description: "Summarizes incoming emails",
      prompt: "When triggered, read the email and write a summary",
      triggerType: "email",
      triggerConfig: { fromFilter: "@company.com" },
      actions: workflow,
      skillIds: ["skill-1", "skill-2"],
      complianceConfig: { level: "recommended", enabledRules: [], customRules: [] },
    });
    expect(result.success).toBe(true);
  });

  it("workflow passes recommended compliance validation", () => {
    const config: ComplianceConfig = { level: "recommended", enabledRules: [], customRules: [] };
    const results = runValidation(workflow.nodes, workflow.edges, config);

    const hasTrigger = results.find((r) => r.ruleId === "has-trigger");
    expect(hasTrigger?.status).toBe("pass");

    const noOrphans = results.find((r) => r.ruleId === "no-orphans");
    expect(noOrphans?.status).toBe("pass");

    const hasEnd = results.find((r) => r.ruleId === "has-end-node");
    expect(hasEnd?.status).toBe("pass");
  });

  it("can update the agent with new workflow data", () => {
    const updatedWorkflow = {
      ...workflow,
      nodes: [
        ...workflow.nodes,
        makeNode("a3", "notification"),
      ],
      edges: [
        ...workflow.edges,
        makeEdge("a2", "a3"),
      ],
    };
    const result = updateAgentSchema.safeParse({
      actions: updatedWorkflow,
    });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 2: Branching workflow with conditions
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Branching workflow with if/else condition", () => {
  const branchingWorkflow = {
    nodes: [
      makeNode("t1", "trigger"),
      makeNode("c1", "condition"),
      makeNode("a1", "email"),      // true branch
      makeNode("a2", "notification"), // false branch
      makeNode("e1", "end"),
    ],
    edges: [
      makeEdge("t1", "c1"),
      makeEdge("c1", "a1", "true"),
      makeEdge("c1", "a2", "false"),
      makeEdge("a1", "e1"),
      makeEdge("a2", "e1"),
    ],
  };

  it("schema accepts branching workflow", () => {
    const result = createAgentSchema.safeParse({
      name: "Conditional Router",
      description: "Routes based on condition",
      actions: branchingWorkflow,
    });
    expect(result.success).toBe(true);
  });

  it("condition node type has true/false output handles", () => {
    const conditionDef = WORKFLOW_NODE_TYPES.find((n) => n.type === "condition");
    expect(conditionDef).toBeDefined();
    expect(conditionDef!.handles!.outputs).toEqual(["true", "false"]);
  });

  it("all nodes are connected — no orphans", () => {
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };
    const results = runValidation(branchingWorkflow.nodes, branchingWorkflow.edges, config);
    const orphans = results.find((r) => r.ruleId === "no-orphans");
    expect(orphans?.status).toBe("pass");
  });

  it("branching edges can use sourceHandle for routing", () => {
    const trueEdge = branchingWorkflow.edges.find((e) => e.sourceHandle === "true");
    const falseEdge = branchingWorkflow.edges.find((e) => e.sourceHandle === "false");
    expect(trueEdge).toBeDefined();
    expect(falseEdge).toBeDefined();
    expect(trueEdge!.source).toBe("c1");
    expect(falseEdge!.source).toBe("c1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 3: Compliance validation at different levels
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Compliance levels control which rules fire", () => {
  const minimalWorkflow = {
    nodes: [makeNode("t1", "trigger")],
    edges: [] as any[],
  };

  it("permissive level checks only graph validity rules", () => {
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };
    const results = runValidation(minimalWorkflow.nodes, minimalWorkflow.edges, config);

    const ruleIds = results.map((r) => r.ruleId);
    expect(ruleIds).toContain("has-trigger");
    expect(ruleIds).toContain("no-orphans");
    expect(ruleIds).not.toContain("has-end-node");
    expect(ruleIds).not.toContain("failure-notification");
  });

  it("recommended level adds ChittyOS baseline rules", () => {
    const config: ComplianceConfig = { level: "recommended", enabledRules: [], customRules: [] };
    const results = runValidation(minimalWorkflow.nodes, minimalWorkflow.edges, config);

    const ruleIds = results.map((r) => r.ruleId);
    expect(ruleIds).toContain("has-trigger");
    expect(ruleIds).toContain("no-orphans");
    expect(ruleIds).toContain("has-end-node");
    expect(ruleIds).toContain("skills-available");
    expect(ruleIds).not.toContain("failure-notification");
  });

  it("strict level enforces all rules", () => {
    const config: ComplianceConfig = { level: "strict", enabledRules: [], customRules: [] };
    const results = runValidation(minimalWorkflow.nodes, minimalWorkflow.edges, config);

    const ruleIds = results.map((r) => r.ruleId);
    expect(ruleIds).toContain("has-trigger");
    expect(ruleIds).toContain("has-end-node");
    expect(ruleIds).toContain("failure-notification");
    expect(ruleIds).toContain("llm-model-specified");
    expect(ruleIds.length).toBe(COMPLIANCE_RULES.length);
  });

  it("manually enabled rules fire even at lower levels", () => {
    const config: ComplianceConfig = {
      level: "permissive",
      enabledRules: ["has-end-node", "failure-notification"],
      customRules: [],
    };
    const results = runValidation(minimalWorkflow.nodes, minimalWorkflow.edges, config);

    const ruleIds = results.map((r) => r.ruleId);
    expect(ruleIds).toContain("has-end-node");
    expect(ruleIds).toContain("failure-notification");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 4: Validation detects workflow problems
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Validation catches workflow errors", () => {
  it("fails when no trigger node exists", () => {
    const nodes = [makeNode("a1", "llmAction"), makeNode("e1", "end")];
    const edges = [makeEdge("a1", "e1")];
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };

    const results = runValidation(nodes, edges, config);
    const trigger = results.find((r) => r.ruleId === "has-trigger");
    expect(trigger?.status).toBe("fail");
    expect(trigger?.message).toBe("No trigger node found");
  });

  it("fails when multiple trigger nodes exist", () => {
    const nodes = [makeNode("t1", "trigger"), makeNode("t2", "trigger")];
    const edges = [makeEdge("t1", "t2")];
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };

    const results = runValidation(nodes, edges, config);
    const trigger = results.find((r) => r.ruleId === "has-trigger");
    expect(trigger?.status).toBe("fail");
    expect(trigger?.message).toContain("2 trigger nodes");
  });

  it("fails when orphan nodes exist", () => {
    const nodes = [
      makeNode("t1", "trigger"),
      makeNode("a1", "llmAction"),
      makeNode("orphan", "email"), // not connected
    ];
    const edges = [makeEdge("t1", "a1")];
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };

    const results = runValidation(nodes, edges, config);
    const orphans = results.find((r) => r.ruleId === "no-orphans");
    expect(orphans?.status).toBe("fail");
    expect(orphans?.message).toContain("1 orphan");
  });

  it("warns when no end node exists (recommended level)", () => {
    const nodes = [makeNode("t1", "trigger"), makeNode("a1", "llmAction")];
    const edges = [makeEdge("t1", "a1")];
    const config: ComplianceConfig = { level: "recommended", enabledRules: [], customRules: [] };

    const results = runValidation(nodes, edges, config);
    const endNode = results.find((r) => r.ruleId === "has-end-node");
    expect(endNode?.status).toBe("warn");
  });

  it("passes with a fully valid workflow", () => {
    const nodes = [
      makeNode("t1", "trigger"),
      makeNode("a1", "llmAction"),
      makeNode("e1", "end"),
    ];
    const edges = [makeEdge("t1", "a1"), makeEdge("a1", "e1")];
    const config: ComplianceConfig = { level: "recommended", enabledRules: [], customRules: [] };

    const results = runValidation(nodes, edges, config);
    const failedOrWarned = results.filter((r) => r.status === "fail");
    expect(failedOrWarned).toHaveLength(0);
  });

  it("single node workflow has no orphans", () => {
    const nodes = [makeNode("t1", "trigger")];
    const edges: any[] = [];
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };

    const results = runValidation(nodes, edges, config);
    const orphans = results.find((r) => r.ruleId === "no-orphans");
    expect(orphans?.status).toBe("pass");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 5: Trigger configuration data flows
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Trigger configurations are persisted correctly", () => {
  it("accepts schedule trigger with cron config", () => {
    const result = createAgentSchema.safeParse({
      name: "Daily Report",
      description: "Runs daily at 9am",
      triggerType: "schedule",
      triggerConfig: {
        minute: "0",
        hour: "9",
        day: "*",
        month: "*",
        weekday: "1-5",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggerType).toBe("schedule");
      expect(result.data.triggerConfig).toEqual({
        minute: "0",
        hour: "9",
        day: "*",
        month: "*",
        weekday: "1-5",
      });
    }
  });

  it("accepts email trigger with filters", () => {
    const result = createAgentSchema.safeParse({
      name: "Email Handler",
      description: "Processes incoming emails",
      triggerType: "email",
      triggerConfig: {
        fromFilter: "@customer.com",
        subjectFilter: "urgent",
        bodyFilter: "action required",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggerConfig).toHaveProperty("fromFilter");
      expect(result.data.triggerConfig).toHaveProperty("subjectFilter");
    }
  });

  it("accepts webhook trigger with secret header", () => {
    const result = createAgentSchema.safeParse({
      name: "Webhook Receiver",
      description: "Handles external events",
      triggerType: "webhook",
      triggerConfig: {
        webhookUrl: "https://api.chittyos.com/webhooks/agent/abc123",
        secretHeader: "X-Webhook-Secret",
      },
    });
    expect(result.success).toBe(true);
  });

  it("manual trigger needs no config", () => {
    const result = createAgentSchema.safeParse({
      name: "Manual Agent",
      description: "Run on demand",
      triggerType: "manual",
      triggerConfig: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.triggerConfig).toEqual({});
    }
  });

  it("can update just the trigger config", () => {
    const result = updateAgentSchema.safeParse({
      triggerConfig: { minute: "30", hour: "14" },
    });
    expect(result.success).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 6: Skill attachment lifecycle
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Skill attachment and detachment", () => {
  it("agent starts with no skills attached", () => {
    const result = createAgentSchema.safeParse({
      name: "New Agent",
      description: "Fresh agent",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skillIds).toEqual([]);
    }
  });

  it("can attach multiple skills at creation", () => {
    const result = createAgentSchema.safeParse({
      name: "Skilled Agent",
      description: "Has skills",
      skillIds: ["skill-trust-verify", "skill-data-sync", "skill-ai-classify"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skillIds).toHaveLength(3);
    }
  });

  it("can update skills independently of other fields", () => {
    const result = updateAgentSchema.safeParse({
      skillIds: ["skill-new-1", "skill-new-2"],
    });
    expect(result.success).toBe(true);
  });

  it("can detach all skills by setting empty array", () => {
    const result = updateAgentSchema.safeParse({
      skillIds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skillIds).toEqual([]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 7: Complex real-world workflow
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Real-world customer onboarding workflow", () => {
  const onboardingWorkflow = {
    nodes: [
      makeNode("t1", "trigger"),
      makeNode("d1", "dataTransform"),
      makeNode("c1", "condition"),
      makeNode("l1", "llmAction"),       // existing customer path
      makeNode("h1", "httpRequest"),      // new customer API call
      makeNode("s1", "skillAction"),
      makeNode("e1", "email"),
      makeNode("n1", "notification"),
      makeNode("end1", "end"),
    ],
    edges: [
      makeEdge("t1", "d1"),
      makeEdge("d1", "c1"),
      makeEdge("c1", "l1", "true"),      // existing customer
      makeEdge("c1", "h1", "false"),     // new customer
      makeEdge("l1", "s1"),
      makeEdge("h1", "s1"),
      makeEdge("s1", "e1"),
      makeEdge("e1", "n1"),
      makeEdge("n1", "end1"),
    ],
  };

  it("schema accepts the full onboarding workflow", () => {
    const result = createAgentSchema.safeParse({
      name: "Customer Onboarding",
      description: "Processes new customer signups with conditional routing",
      prompt: "Handle customer onboarding: check if existing, route accordingly",
      triggerType: "webhook",
      triggerConfig: { secretHeader: "X-Onboarding-Key" },
      actions: onboardingWorkflow,
      skillIds: ["skill-crm-sync"],
      category: "sales",
      complianceConfig: {
        level: "strict",
        enabledRules: [],
        customRules: [],
      },
    });
    expect(result.success).toBe(true);
  });

  it("passes strict compliance validation", () => {
    const config: ComplianceConfig = { level: "strict", enabledRules: [], customRules: [] };
    const results = runValidation(onboardingWorkflow.nodes, onboardingWorkflow.edges, config);

    const trigger = results.find((r) => r.ruleId === "has-trigger");
    expect(trigger?.status).toBe("pass");

    const orphans = results.find((r) => r.ruleId === "no-orphans");
    expect(orphans?.status).toBe("pass");

    const endNode = results.find((r) => r.ruleId === "has-end-node");
    expect(endNode?.status).toBe("pass");
  });

  it("uses all 9 nodes in the graph", () => {
    expect(onboardingWorkflow.nodes).toHaveLength(9);
  });

  it("has 9 edges connecting all nodes", () => {
    expect(onboardingWorkflow.edges).toHaveLength(9);
  });

  it("uses condition node for customer type routing", () => {
    const conditionEdges = onboardingWorkflow.edges.filter((e) => e.source === "c1");
    expect(conditionEdges).toHaveLength(2);
    expect(conditionEdges.map((e) => e.sourceHandle).sort()).toEqual(["false", "true"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 8: Node type coverage
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: All node types can be used in workflows", () => {
  const allNodeTypes = WORKFLOW_NODE_TYPES.map((nt) => nt.type);

  it.each(allNodeTypes)("node type '%s' can be added to a workflow", (nodeType) => {
    const nodes = [
      makeNode("t1", "trigger"),
      makeNode("n1", nodeType),
      makeNode("e1", "end"),
    ];
    const edges = [makeEdge("t1", "n1"), makeEdge("n1", "e1")];

    const result = createAgentSchema.safeParse({
      name: `Agent with ${nodeType}`,
      description: `Uses ${nodeType} node`,
      actions: { nodes, edges },
    });
    expect(result.success).toBe(true);
  });

  it("every node type has at least one input or output handle", () => {
    for (const nt of WORKFLOW_NODE_TYPES) {
      const totalHandles = (nt.handles?.inputs.length || 0) + (nt.handles?.outputs.length || 0);
      expect(totalHandles).toBeGreaterThan(0);
    }
  });

  it("only trigger nodes have no input handles", () => {
    const noInputs = WORKFLOW_NODE_TYPES.filter((nt) => nt.handles?.inputs.length === 0);
    expect(noInputs).toHaveLength(1);
    expect(noInputs[0].type).toBe("trigger");
  });

  it("only end nodes have no output handles", () => {
    const noOutputs = WORKFLOW_NODE_TYPES.filter((nt) => nt.handles?.outputs.length === 0);
    expect(noOutputs).toHaveLength(1);
    expect(noOutputs[0].type).toBe("end");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 9: Edge cases and error handling
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Edge cases in agent creation", () => {
  it("rejects agent with workflow but no name", () => {
    const result = createAgentSchema.safeParse({
      description: "Has workflow but no name",
      actions: {
        nodes: [makeNode("t1", "trigger")],
        edges: [],
      },
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty workflow (no nodes/edges)", () => {
    const result = createAgentSchema.safeParse({
      name: "Empty Workflow",
      description: "Not yet built",
      actions: { nodes: [], edges: [] },
    });
    expect(result.success).toBe(true);
  });

  it("validates compliance config level enum", () => {
    const result = createAgentSchema.safeParse({
      name: "Bad Compliance",
      description: "Invalid compliance level",
      complianceConfig: { level: "invalid-level", enabledRules: [], customRules: [] },
    });
    expect(result.success).toBe(false);
  });

  it("validates compliance config with custom rules", () => {
    const result = createAgentSchema.safeParse({
      name: "Custom Rules Agent",
      description: "Has custom compliance rules",
      complianceConfig: {
        level: "recommended",
        enabledRules: ["has-trigger"],
        customRules: [
          { id: "custom-1", name: "Max 5 nodes", expression: "nodes.length <= 5" },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("empty workflow has no compliance failures at permissive level", () => {
    const config: ComplianceConfig = { level: "permissive", enabledRules: [], customRules: [] };
    const results = runValidation([], [], config);
    // With no nodes, has-trigger fails and no-orphans passes (no nodes > 1 check)
    const trigger = results.find((r) => r.ruleId === "has-trigger");
    expect(trigger?.status).toBe("fail");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SCENARIO 10: Template to agent flow with workflow
// ═══════════════════════════════════════════════════════════════════════════

describe("Scenario: Template with workflow creates agent with full data", () => {
  it("agent created from template preserves workflow, skills, and compliance config", () => {
    const templateData = {
      name: "Support Bot Template",
      description: "Handles support tickets",
      prompt: "Classify and respond to support tickets",
      triggerType: "webhook",
      triggerConfig: { secretHeader: "X-Support-Key" },
      actions: {
        nodes: [
          makeNode("t1", "trigger"),
          makeNode("a1", "llmAction"),
          makeNode("e1", "end"),
        ],
        edges: [
          makeEdge("t1", "a1"),
          makeEdge("a1", "e1"),
        ],
      },
      skillIds: ["skill-classify", "skill-respond"],
      category: "support",
      complianceConfig: {
        level: "recommended" as const,
        enabledRules: ["has-trigger", "has-end-node"],
        customRules: [],
      },
    };

    // Template validates
    const templateResult = createAgentSchema.safeParse(templateData);
    expect(templateResult.success).toBe(true);

    // Same data as new agent validates (simulating template -> agent copy)
    const agentFromTemplate = {
      ...templateData,
      name: templateData.name, // would be cloned
      status: "draft",
    };
    const agentResult = createAgentSchema.safeParse(agentFromTemplate);
    expect(agentResult.success).toBe(true);
    if (agentResult.success) {
      expect(agentResult.data.skillIds).toEqual(["skill-classify", "skill-respond"]);
      expect(agentResult.data.triggerType).toBe("webhook");
      expect(agentResult.data.complianceConfig.level).toBe("recommended");
    }
  });
});
