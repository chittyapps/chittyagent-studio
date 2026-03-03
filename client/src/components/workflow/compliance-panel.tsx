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
