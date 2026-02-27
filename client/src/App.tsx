import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/app-header";
import Home from "@/pages/home";
import AgentDetail from "@/pages/agent-detail";
import AgentBuilder from "@/pages/agent-builder";
import Templates from "@/pages/templates";
import TemplateDetail from "@/pages/template-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/agents/new" component={AgentBuilder} />
      <Route path="/agents/:id/edit" component={AgentBuilder} />
      <Route path="/agents/:id" component={AgentDetail} />
      <Route path="/templates" component={Templates} />
      <Route path="/templates/:id" component={TemplateDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <AppHeader />
            <main>
              <Router />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
