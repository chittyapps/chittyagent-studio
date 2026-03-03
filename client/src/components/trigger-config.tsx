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
              Cron: {String(triggerConfig.minute ?? "*")} {String(triggerConfig.hour ?? "*")} {String(triggerConfig.day ?? "*")} {String(triggerConfig.month ?? "*")} {String(triggerConfig.weekday ?? "*")}
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
