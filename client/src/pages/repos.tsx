import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { type GithubRepo } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ExternalLink, GitFork, Star, Search, RefreshCw, Loader2
} from "lucide-react";
import { SiGithub } from "react-icons/si";
import { useState, useMemo } from "react";

const langColors: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3776ab",
  Go: "#00add8",
  Shell: "#89e051",
  HTML: "#e34c26",
};

const orgLabels: Record<string, string> = {
  all: "All Orgs",
  chittyos: "chittyos",
  chittyfoundation: "chittyfoundation",
  chittyapps: "chittyapps",
  "furnished-condos": "furnished-condos",
};

export default function Repos() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeOrg, setActiveOrg] = useState("all");

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/github/sync");
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/github/repos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({ title: "Repos synced", description: `Synced ${data.count} repos from GitHub` });
    },
    onError: () => {
      toast({ title: "Sync failed", description: "Could not fetch repos from GitHub", variant: "destructive" });
    },
  });

  const { data: repos, isLoading } = useQuery<GithubRepo[]>({
    queryKey: ["/api/github/repos"],
  });

  const availableOrgs = useMemo(() => {
    if (!repos) return [];
    const orgs = new Set(repos.map((r) => r.org));
    return Array.from(orgs).sort();
  }, [repos]);

  const filtered = repos?.filter((r) => {
    if (activeOrg !== "all" && r.org !== activeOrg) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const orgCounts = useMemo(() => {
    if (!repos) return {};
    const counts: Record<string, number> = {};
    for (const r of repos) {
      counts[r.org] = (counts[r.org] || 0) + 1;
    }
    return counts;
  }, [repos]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate("/")}
        className="mb-4 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </Button>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <SiGithub className="w-5 h-5" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Repositories</h1>
          {repos && (
            <Badge variant="secondary" className="text-xs">{repos.length} repos</Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          data-testid="button-sync-repos"
        >
          {syncMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
          )}
          Sync from GitHub
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Live data from the ChittyOS ecosystem GitHub organizations
      </p>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Button
          size="sm"
          variant={activeOrg === "all" ? "default" : "secondary"}
          onClick={() => setActiveOrg("all")}
          data-testid="button-org-all"
        >
          All ({repos?.length || 0})
        </Button>
        {availableOrgs.map((org) => (
          <Button
            key={org}
            size="sm"
            variant={activeOrg === org ? "default" : "secondary"}
            onClick={() => setActiveOrg(org)}
            data-testid={`button-org-${org}`}
          >
            {orgLabels[org] || org} ({orgCounts[org] || 0})
          </Button>
        ))}
      </div>

      <div className="relative max-w-md mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search repos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-search-repos"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((repo) => (
            <Card
              key={repo.id}
              className="p-4 hover-elevate transition-all cursor-pointer group"
              onClick={() => window.open(repo.htmlUrl, "_blank")}
              data-testid={`card-repo-${repo.name}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-primary truncate">
                      {repo.name}
                    </h3>
                    <span className="text-[10px] text-muted-foreground">{repo.org}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
                  {repo.description || "No description"}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {repo.language && (
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: langColors[repo.language] || "#888" }}
                      />
                      <span className="text-[11px] text-muted-foreground">{repo.language}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="w-3 h-3" />
                    {repo.stars}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <GitFork className="w-3 h-3" />
                    {repo.forks}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No repos match your search</p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Button
          variant="secondary"
          onClick={() => window.open("https://github.com/chittyos", "_blank")}
          data-testid="button-view-org"
        >
          <SiGithub className="w-4 h-4 mr-2" />
          View on GitHub
        </Button>
      </div>
    </div>
  );
}
