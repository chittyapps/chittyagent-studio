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
        const updated = [...nds, newNode as typeof nds[number]];
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
