import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, Plus, Search, Sparkles, Puzzle } from "lucide-react";
import { SiGithub } from "react-icons/si";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export function AppHeader() {
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 px-4 h-14 border-b bg-background/95 backdrop-blur-sm" data-testid="app-header">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 shrink-0"
          data-testid="link-home"
        >
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm hidden sm:inline">ChittyAgent Studio</span>
        </button>

        <div className="relative max-w-md flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/skills")}
          data-testid="button-nav-skills"
        >
          <Puzzle className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Skills</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate("/repos")}
          data-testid="button-nav-repos"
        >
          <SiGithub className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Repos</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          onClick={() => navigate("/agents/new")}
          data-testid="button-create-agent"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">Create agent</span>
        </Button>
      </div>
    </header>
  );
}
