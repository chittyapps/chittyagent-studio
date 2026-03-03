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
