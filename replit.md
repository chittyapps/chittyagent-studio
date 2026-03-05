# ChittyAgent Studio

A no-code AI agent builder platform for the ChittyOS ecosystem (chitty.cc/os, github.com/chittyos). Users can create workflow agents and add reusable skills from ChittyOS services like ChittyScore, ChittyVerify, ChittyIntel, and more.

## Architecture

- **Frontend**: React + TypeScript with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **State Management**: TanStack React Query

## Data Models

- **agents**: AI agents with name, description, prompt, icon, color, trigger type, category, status, run count, skillIds, workflow actions
- **agentRuns**: Execution history for each agent with status, result, steps, stepLogs (real-time step tracking)
- **skills**: Reusable ChittyOS ecosystem capabilities (ChittyScore, ChittyVerify, etc.) with name, description, icon, category, repoUrl, language, capabilities array, installCount
- **githubRepos**: Cached ChittyOS GitHub organization repos with name, description, language, stars, forks, htmlUrl
- **connections**: Service connections (AI, source, trigger, action, platform) with name, type, provider, status, config, icon, color
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
| `/connections` | Connections | Manage service connections (AI, GitHub, webhook, email, platform) |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/agents` | List user agents |
| POST | `/api/agents` | Create agent (validated with Zod) |
| GET | `/api/agents/:id` | Get agent details |
| PATCH | `/api/agents/:id` | Update agent (validated with Zod) |
| DELETE | `/api/agents/:id` | Delete agent |
| POST | `/api/agents/:id/run` | Run agent (real AI execution via OpenAI gpt-4o) |
| GET | `/api/agents/:id/runs` | Get run history with step logs |
| GET | `/api/templates` | List templates |
| GET | `/api/templates/:id` | Get template details |
| POST | `/api/templates/:id/use` | Create agent from template |
| GET | `/api/skills` | List ecosystem skills |
| GET | `/api/skills/:id` | Get skill details |
| POST | `/api/skills/:id/install` | Increment skill install count |
| GET | `/api/github/repos` | List ChittyOS GitHub repos |
| GET | `/api/connections` | List service connections |
| POST | `/api/connections` | Create a connection |
| PATCH | `/api/connections/:id` | Update connection |
| DELETE | `/api/connections/:id` | Delete connection |
| POST | `/api/connections/:id/test` | Test connection connectivity |

## Seed Data

- 8 agent templates across categories: email, productivity, communication, data, HR, sales, support
- 14 ChittyOS ecosystem skills: ChittyScore, ChittyVerify, ChittyIntel, ChittyBeacon, ChittyMonitor, ChittyLedger, ChittyChronicle, ChittyScrape, ChittyMCP, ChittyRouter, ChittyConnect, ChittyAssets, ChittyConcierge, ChittyTrack
- 135 GitHub repos synced from 4 orgs: chittyos (61), chittyfoundation (16), chittyapps (42), furnished-condos (16)
- 5 default connections: Replit AI (connected), GitHub (connected), Webhook (disconnected), Email (disconnected), ChittyOS API (disconnected)

## Key Components

- `AppHeader` - Top navigation with Skills, Repos, Connect, search, theme toggle, create button
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
