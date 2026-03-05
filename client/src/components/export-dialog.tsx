import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Upload, Copy, Check, Download, ExternalLink, Sparkles,
  Code2, Globe, Palette,
} from "lucide-react";
import { SiOpenai } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";

const PLATFORMS = [
  {
    id: "chatgpt",
    name: "ChatGPT / OpenAI",
    description: "Custom GPT config with tools and system prompt",
    Icon: SiOpenai,
    color: "#10a37f",
    docUrl: "https://platform.openai.com/docs/guides/gpts",
  },
  {
    id: "claude",
    name: "Claude / Anthropic",
    description: "Claude project with system prompt and tool definitions",
    Icon: Sparkles,
    color: "#d97706",
    docUrl: "https://docs.anthropic.com/en/docs/build-with-claude/projects",
  },
  {
    id: "api",
    name: "Generic API / Other",
    description: "Universal JSON format for any LLM platform",
    Icon: Download,
    color: "#6366f1",
    docUrl: null,
  },
];

interface ExportDialogProps {
  agentId: string;
  agentName: string;
  agentColor?: string;
  trigger?: React.ReactNode;
}

export function ExportDialog({ agentId, agentName, agentColor = "#4285f4", trigger }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [embedTheme, setEmbedTheme] = useState("light");
  const [embedPosition, setEmbedPosition] = useState("bottom-right");
  const { toast } = useToast();

  const { data: exportData, isLoading } = useQuery<Record<string, unknown>>({
    queryKey: ["/api/agents", agentId, "export", selectedPlatform],
    enabled: !!selectedPlatform && selectedPlatform !== "embed" && open,
  });

  const exportJson = exportData ? JSON.stringify(exportData, null, 2) : "";

  const baseUrl = window.location.origin;
  const safeName = agentName.replace(/[&<>"']/g, "");
  const embedCode = `<script src="${baseUrl}/embed/widget.js"
  data-agent-id="${agentId}"
  data-title="${safeName}"
  data-theme="${embedTheme}"
  data-position="${embedPosition}"
  data-color="${agentColor}"
><\/script>`;

  const handleCopy = async (text: string, type: "export" | "embed") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "export") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setEmbedCopied(true);
        setTimeout(() => setEmbedCopied(false), 2000);
      }
      toast({ title: "Copied to clipboard" });
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
          <DialogTitle className="text-lg">Export &amp; Embed</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Deploy "{agentName}" as an embeddable widget or export to other platforms
          </p>
        </DialogHeader>

        <Tabs defaultValue="embed" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="embed" className="flex-1" data-testid="tab-embed">
              <Code2 className="w-3.5 h-3.5 mr-1" /> Embed
            </TabsTrigger>
            <TabsTrigger value="export" className="flex-1" data-testid="tab-export">
              <Upload className="w-3.5 h-3.5 mr-1" /> Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="embed" className="space-y-4 mt-4">
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Embeddable Chat Widget</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Drop a single script tag into any website. No packages, no build steps. 
                    The widget connects back here so you can update your agent anytime and changes go live everywhere.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Theme</Label>
                <Select value={embedTheme} onValueChange={setEmbedTheme}>
                  <SelectTrigger data-testid="select-embed-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Position</Label>
                <Select value={embedPosition} onValueChange={setEmbedPosition}>
                  <SelectTrigger data-testid="select-embed-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bottom-right">Bottom right</SelectItem>
                    <SelectItem value="bottom-left">Bottom left</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Embed code</Label>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(embedCode, "embed")}
                  data-testid="button-copy-embed"
                >
                  {embedCopied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {embedCopied ? "Copied" : "Copy snippet"}
                </Button>
              </div>
              <pre
                className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-auto whitespace-pre-wrap"
                data-testid="text-embed-code"
              >
                {embedCode}
              </pre>
            </div>

            <Card className="p-3 bg-muted/30">
              <h4 className="text-xs font-semibold mb-2">How it works</h4>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Paste the script tag into your website's HTML</li>
                <li>A chat bubble appears in the corner of your page</li>
                <li>Visitors click it to chat with your agent in real time</li>
                <li>Update the agent here and changes go live automatically</li>
              </ol>
            </Card>

            <div className="flex items-center gap-2">
              <Palette className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                Widget uses your agent's color ({agentColor}). Customize theme and position above.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="export" className="mt-4">
            {!selectedPlatform ? (
              <div className="space-y-3">
                {PLATFORMS.map((platform) => {
                  const PlatformIcon = platform.Icon;
                  return (
                    <Card
                      key={platform.id}
                      className="p-4 cursor-pointer transition-colors border-2 border-transparent"
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
                          <h3 className="font-semibold text-sm">{platform.name}</h3>
                          <p className="text-xs text-muted-foreground">{platform.description}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-4">
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
                      onClick={() => handleCopy(exportJson, "export")}
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
