# ChittyAgent Studio

A no-code AI agent builder platform for the ChittyOS ecosystem (chitty.cc/os, github.com/chittyos). Users can create workflow agents and add reusable skills from ChittyOS services like ChittyScore, ChittyVerify, ChittyIntel, and more.

## Architecture

- **Frontend**: React + TypeScript with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **State Management**: TanStack React Query

## Data Models

- **agents**: AI agents with name, description, prompt, icon, color, trigger type, category, status, run count, skillIds
- **agentRuns**: Execution history for each agent with status, result, steps
- **skills**: Reusable ChittyOS ecosystem capabilities (ChittyScore, ChittyVerify, etc.) with name, description, icon, category, repoUrl, language, capabilities array, installCount
- **githubRepos**: Cached ChittyOS GitHub organization repos with name, description, language, stars, forks, htmlUrl
- **users**: Basic user model (unused currently)

Templates are stored as agents with `isTemplate: true`.

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | Home | Dashboard with user agents, ecosystem skills preview, template gallery |
| `/agents/new` | AgentBuilder | Create new agent form |
| `/agents/:id` | AgentDetail | Agent details, stats, run history, actions |
| `/agents/:id/edit` | AgentBuilder | Edit existing agent |
| `/templates` | Templates | Template library with category filters |
| `/templates/:id` | TemplateDetail | Template details with "Use template" action |
| `/skills` | Skills | ChittyOS ecosystem skills with category filters, install action |
| `/repos` | Repos | ChittyOS GitHub repositories browser |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/agents` | List user agents |
| POST | `/api/agents` | Create agent (validated with Zod) |
| GET | `/api/agents/:id` | Get agent details |
| PATCH | `/api/agents/:id` | Update agent (validated with Zod) |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/agents/:id/run` | Run agent (simulated) |
| GET | `/api/agents/:id/runs` | Get run history |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template details |
| POST | `/api/templates/:id/use` | Create agent from template |
| GET | `/api/skills` | List ecosystem skills |
| GET | `/api/skills/:id` | Get skill details |
| POST | `/api/skills/:id/install` | Increment skill install count |
| GET | `/api/github/repos` | List ChittyOS GitHub repos |

## Seed Data

- 8 agent templates across categories: email, productivity, communication, data, HR, sales, support
- 14 ChittyOS ecosystem skills: ChittyScore, ChittyVerify, ChittyIntel, ChittyBeacon, ChittyMonitor, ChittyLedger, ChittyChronicle, ChittyScrape, ChittyMCP, ChittyRouter, ChittyConnect, ChittyAssets, ChittyConcierge, ChittyTrack
- 25 GitHub repos from the chittyos organization

## Key Components

- `AppHeader` - Top navigation with Skills, Repos, search, theme toggle, create button
- `AgentCard` / `TemplateCard` - Card components for agents/templates
- `ThemeProvider` - Light/dark mode support
- `RunHistory` - Agent execution history display
- `EmptyState` - Shown when no agents exist

## Design

- Font: Plus Jakarta Sans
- Primary color: Blue (#4285f4)
- Dark mode supported via class-based toggling
- No hover:bg-* on buttons; use hover-elevate system
- No emoji in UI
