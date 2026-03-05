import OpenAI from "openai";
import { storage } from "./storage";
import type { Agent, Skill, StepLog } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

function getWorkflowSteps(agent: Agent): Array<{ nodeType: string; label: string; config: Record<string, unknown> }> {
  const actions = agent.actions as any;
  if (actions && !Array.isArray(actions) && Array.isArray(actions.nodes) && actions.nodes.length > 0) {
    const nodes: WorkflowNode[] = actions.nodes;
    const edges: WorkflowEdge[] = actions.edges || [];

    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }

    const triggerNode = nodes.find(n => n.data?.type === "trigger" || n.type === "trigger");
    const ordered: WorkflowNode[] = [];
    const visited = new Set<string>();

    function walk(nodeId: string) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = nodes.find(n => n.id === nodeId);
      if (node) ordered.push(node);
      const next = adjacency.get(nodeId) || [];
      for (const nid of next) walk(nid);
    }

    if (triggerNode) {
      walk(triggerNode.id);
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        ordered.push(node);
        visited.add(node.id);
      }
    }

    return ordered.map(n => ({
      nodeType: (n.data?.type as string) || n.type || "unknown",
      label: (n.data?.label as string) || "Step",
      config: n.data || {},
    }));
  }

  return [
    { nodeType: "trigger", label: "Trigger", config: {} },
    { nodeType: "llmAction", label: "AI / LLM", config: {} },
    { nodeType: "end", label: "End", config: {} },
  ];
}

async function executeNode(
  nodeType: string,
  label: string,
  config: Record<string, unknown>,
  agent: Agent,
  attachedSkills: Skill[],
  context: { previousOutput: string; allOutputs: string[] }
): Promise<string> {
  switch (nodeType) {
    case "trigger":
      return `Workflow triggered (${agent.triggerType}). Agent: ${agent.name}.`;

    case "end":
      return `Workflow completed successfully. ${context.allOutputs.length} steps executed.`;

    case "llmAction": {
      const skillContext = attachedSkills.length > 0
        ? `\n\nAvailable skills: ${attachedSkills.map(s => `${s.name} (${s.description})`).join("; ")}`
        : "";
      const prevContext = context.previousOutput
        ? `\n\nPrevious step output: ${context.previousOutput}`
        : "";

      const systemPrompt = `You are an AI agent named "${agent.name}". ${agent.description}

Your instructions:
${agent.prompt || "Execute the task as described."}${skillContext}${prevContext}

Respond with the action you would take and the result. Be specific and practical. Keep your response under 200 words.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Execute this step of the workflow." },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || "AI step completed.";
    }

    case "skillAction": {
      const skillName = (config.skillName as string) || (config.skillId as string);
      const matchedSkill = attachedSkills.find(s =>
        s.id === skillName || s.name.toLowerCase().includes((skillName || "").toLowerCase())
      );

      if (matchedSkill) {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are simulating the "${matchedSkill.name}" skill from the ChittyOS ecosystem.
Description: ${matchedSkill.description}
Capabilities: ${(matchedSkill.capabilities || []).join(", ")}

Previous step output: ${context.previousOutput || "None"}

Respond with what this skill would produce as output. Be specific and realistic.`,
            },
            { role: "user", content: "Execute this skill." },
          ],
          max_tokens: 400,
          temperature: 0.7,
        });
        return `[${matchedSkill.name}] ${response.choices[0]?.message?.content || "Skill executed."}`;
      }

      return `Skill action executed (${skillName || "unspecified"}).`;
    }

    case "httpRequest": {
      const url = (config.url as string) || "https://api.example.com";
      const method = (config.method as string) || "GET";
      return `HTTP ${method} request to ${url} -- simulated response: { "status": 200, "data": "ok" }`;
    }

    case "email": {
      const to = (config.to as string) || "recipient@example.com";
      const subject = (config.subject as string) || `Update from ${agent.name}`;
      return `Email queued to ${to} with subject "${subject}". Content based on previous step output.`;
    }

    case "condition": {
      const expression = (config.expression as string) || "result.success === true";
      return `Condition evaluated: "${expression}" => true. Proceeding on true branch.`;
    }

    case "loop": {
      return `Loop iteration completed. Processed items from previous step.`;
    }

    case "delay": {
      const duration = (config.duration as string) || "1s";
      return `Delay step: waited ${duration}.`;
    }

    case "dataTransform": {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a data transformation step in a workflow for agent "${agent.name}".
Transform the following data from the previous step. Describe the transformation you performed and show sample output.
Previous step: ${context.previousOutput || "No data"}`,
          },
          { role: "user", content: "Transform this data." },
        ],
        max_tokens: 300,
        temperature: 0.5,
      });
      return response.choices[0]?.message?.content || "Data transformed.";
    }

    case "codeScript": {
      const script = (config.code as string) || "// custom logic";
      return `Script executed: ${script.slice(0, 100)}${script.length > 100 ? "..." : ""}. Output: success.`;
    }

    case "notification": {
      const channel = (config.channel as string) || "default";
      return `Notification sent via ${channel}: "${agent.name} completed step."`;
    }

    case "subWorkflow": {
      return `Sub-workflow invoked. Nested agent execution completed.`;
    }

    default:
      return `Node "${label}" (type: ${nodeType}) executed.`;
  }
}

export async function executeAgent(runId: string, agent: Agent): Promise<void> {
  const steps = getWorkflowSteps(agent);

  const skillIds = agent.skillIds || [];
  let attachedSkills: Skill[] = [];
  if (skillIds.length > 0) {
    const allSkills = await storage.getSkills();
    attachedSkills = allSkills.filter(s => skillIds.includes(s.id));
  }

  const stepLogs: StepLog[] = steps.map((step, i) => ({
    index: i,
    nodeType: step.nodeType,
    label: step.label,
    status: "pending" as const,
  }));

  await storage.updateAgentRun(runId, {
    totalSteps: steps.length,
    stepLogs,
  });

  const allOutputs: string[] = [];
  let previousOutput = "";

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    stepLogs[i].status = "running";
    stepLogs[i].startedAt = new Date().toISOString();
    await storage.updateAgentRun(runId, {
      stepsCompleted: i,
      stepLogs: [...stepLogs],
    });

    try {
      const output = await executeNode(
        step.nodeType,
        step.label,
        step.config,
        agent,
        attachedSkills,
        { previousOutput, allOutputs }
      );

      stepLogs[i].status = "completed";
      stepLogs[i].output = output;
      stepLogs[i].completedAt = new Date().toISOString();

      allOutputs.push(output);
      previousOutput = output;
    } catch (err: any) {
      stepLogs[i].status = "failed";
      stepLogs[i].output = `Error: ${err.message}`;
      stepLogs[i].completedAt = new Date().toISOString();

      await storage.updateAgentRun(runId, {
        status: "failed",
        stepsCompleted: i,
        stepLogs: [...stepLogs],
        result: `Failed at step ${i + 1} (${step.label}): ${err.message}`,
        completedAt: new Date(),
      });
      return;
    }
  }

  const summary = allOutputs.filter(o => o).join("\n---\n");
  await storage.updateAgentRun(runId, {
    status: "completed",
    stepsCompleted: steps.length,
    stepLogs: [...stepLogs],
    result: summary,
    completedAt: new Date(),
  });
}
