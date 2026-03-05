import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Copy, Check, Download, ExternalLink, Sparkles,
} from "lucide-react";
import { SiOpenai } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = [
  {
    id: "chatgpt",
    name: "ChatGPT / OpenAI",
    description: "Export as Custom GPT config with tools and system prompt",
    Icon: SiOpenai,
    color: "#10a37f",
    docUrl: "https://platform.openai.com/docs/guides/gpts",
  },
  {
    id: "claude",
    name: "Claude / Anthropic",
    description: "Export as Claude project with system prompt and tool definitions",
    Icon: Sparkles,
    color: "#d97706",
    docUrl: "https://docs.anthropic.com/en/docs/build-with-claude/projects",
  },
  {
    id: "api",
    name: "Generic API / Other",
    description: "Universal JSON format compatible with any LLM platform",
    Icon: Download,
    color: "#6366f1",
    docUrl: null,
  },
];

interface ExportDialogProps {
  agentId: string;
  agentName: string;
  trigger?: React.ReactNode;
}

export function ExportDialog({ agentId, agentName, trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: exportData, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/agents", agentId, "export", selectedPlatform],
    enabled: !!selectedPlatform && open,
  });

  const exportJson = exportData ? JSON.stringify(exportData, null, 2) : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agentName.replace(/\s+/g, "-").toLowerCase()}-${selectedPlatform}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded", description: `${selectedPlatform} config saved` });
  };

  const handleReset = () => {
    setSelectedPlatform(null);
    setCopied(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) handleReset(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="secondary" data-testid="button-export-agent">
            <Upload className="w-4 h-4 mr-1" /> Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Export agent</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Push "{agentName}" to ChatGPT, Claude, or any LLM platform
          </p>
        </DialogHeader>

        {!selectedPlatform ? (
          <div className="space-y-3 mt-2">
            {PLATFORMS.map((platform) => {
              const PlatformIcon = platform.Icon;
              return (
                <Card
                  key={platform.id}
                  className="p-4 cursor-pointer transition-colors border-2 border-transparent data-[selected=true]:border-primary"
                  onClick={() => setSelectedPlatform(platform.id)}
                  data-testid={`button-export-${platform.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: platform.color + "18", color: platform.color }}
                    >
                      <PlatformIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{platform.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{platform.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {PLATFORMS.find(p => p.id === selectedPlatform)?.name}
                </Badge>
                <Button size="sm" variant="ghost" onClick={handleReset} data-testid="button-export-back">
                  Change platform
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleCopy}
                  disabled={isLoading || !exportData}
                  data-testid="button-export-copy"
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  onClick={handleDownload}
                  disabled={isLoading || !exportData}
                  data-testid="button-export-download"
                >
                  <Download className="w-3.5 h-3.5 mr-1" /> Download
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="animate-pulse h-64 bg-muted rounded-lg" />
            ) : (
              <pre
                className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap"
                data-testid="text-export-preview"
              >
                {exportJson}
              </pre>
            )}

            {(() => {
              const platform = PLATFORMS.find(p => p.id === selectedPlatform);
              if (!platform?.docUrl) return null;
              return (
                <a
                  href={platform.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary"
                  data-testid="link-export-docs"
                >
                  <ExternalLink className="w-3 h-3" /> How to import on {platform.name}
                </a>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
