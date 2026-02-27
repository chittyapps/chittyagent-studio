# Workspace Studio

A clone of Google Workspace Studio - a no-code AI agent builder platform where users can create, manage, and run AI-powered workflow agents.

## Architecture

- **Frontend**: React + TypeScript with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter (frontend), Express (backend)
- **State Management**: TanStack React Query

## Data Models

- **agents**: AI agents with name, description, prompt, icon, color, trigger type, category, status, run count
- **agentRuns**: Execution history for each agent with status, result, steps
- **users**: Basic user model (unused currently)

Templates are stored as agents with `isTemplate: true`.

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | Home | Dashboard with user agents and template gallery |
| `/agents/new` | AgentBuilder | Create new agent form |
| `/agents/:id` | AgentDetail | Agent details, stats, run history, actions |
| `/agents/:id/edit` | AgentBuilder | Edit existing agent |
| `/templates` | Templates | Template library with category filters |
| `/templates/:id` | TemplateDetail | Template details with "Use template" action |

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

## Key Components

- `AppHeader` - Top navigation with search, theme toggle, create button
- `AgentCard` / `TemplateCard` - Card components for agents/templates
- `ThemeProvider` - Light/dark mode support
- `RunHistory` - Agent execution history display
- `EmptyState` - Shown when no agents exist

## Design

- Font: Plus Jakarta Sans
- Primary color: Blue (#4285f4)
- Dark mode supported via class-based toggling
- 8 seed templates across categories: email, productivity, communication, data, HR, sales, support
