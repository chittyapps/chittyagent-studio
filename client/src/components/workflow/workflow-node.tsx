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
