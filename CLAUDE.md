# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Squad is a multi-agent orchestration system that transforms solo developers into AI-powered development teams. It's an interactive REPL environment where multiple specialized AI agents (architect, backend engineer, frontend engineer, QA, etc.) work in parallel on different aspects of a project.

**Key differentiators from Claude Code:**
- Multiple agents working simultaneously with isolated context
- Git worktrees for parallel work isolation
- Workflow-based task coordination with review gates
- Role-specific agent personas with specialized skills

## Technology Stack

- **Runtime**: Bun
- **UI Framework**: OpenTUI (React-based terminal UI)
- **Database**: SQLite with WAL mode
- **State Management**: RxJS for reactive UI updates
- **Validation**: Zod schemas

## Build Commands

```bash
bun install          # Install dependencies
bun run build        # Compile TypeScript
bun run dev          # Watch mode development
bun run cli          # Run CLI directly
bun test             # Run tests with Bun test runner
```

## Architecture

### 4-Layer Architecture

1. **Presentation Layer** (`src/tui/`): OpenTUI screens, components, wizards, overlays
2. **Application Layer** (`src/app/`, `src/core/`): Command routing, workflow engine, agent orchestrator
3. **Domain Layer** (`src/domain/`): Entity definitions, value objects, repository interfaces
4. **Infrastructure Layer** (`src/infra/`): SQLite, Git operations, Claude CLI integration, external APIs

### Key Architectural Concepts

**Context Engineering**: Each agent gets minimal, focused context via:
- WRITE: Persist context to HANDOFF.yaml files
- SELECT: Load only assigned skills per agent
- COMPRESS: Summary returns, not full transcripts
- ISOLATE: Separate worktrees = separate contexts

**Agent Spawning**: Uses Claude CLI with `--output-format stream-json` and selective context injection via `--agents` flag.

**Worktrees**: Git worktrees provide filesystem isolation for parallel agents. Each agent works in its own worktree to prevent conflicts.

### Core Entities

- **Agent**: Specialized AI persona with defined role, tools, skills, and model
- **Skill**: Reusable capability/knowledge that can be assigned to agents
- **Workflow**: Defines stages, agent assignments, and review gates
- **Feature**: Tracks progress of work through a workflow
- **Session**: Persists conversation and workflow state across restarts
- **Handoff**: Structured context transfer between agents/stages

### Directory Structure

```
src/
├── cli/           # CLI entry point, argument parsing
├── app/           # Application services, chat handler, config
├── tui/           # OpenTUI renderer, screens, components, overlays
├── core/          # Business logic, commands, workflow, agents
├── domain/        # Entity definitions, repositories
├── infra/         # SQLite, Git, Claude CLI, integrations
└── utils/         # Logger, events, ID generation

assets/
├── agents/        # Built-in agent YAML definitions
├── workflows/     # Built-in workflow YAML definitions
└── templates/     # Templates for creating new agents/skills/workflows
```

## Implementation Patterns

### OpenTUI Components
Use React-style components with OpenTUI primitives (`box`, `text`). Use `useObservable` hook for reactive state from RxJS observables.

### Repository Pattern
All entities use repository pattern with branded ID types (e.g., `SessionId`, `AgentId`). SQLite with parameterized queries only.

### Agent Spawning
```typescript
const proc = Bun.spawn(['claude', '--output-format', 'stream-json', '--print', ...args], {
  cwd: worktreePath,
  stdout: 'pipe',
});
```
Parse output with async generator over newline-delimited JSON.

### Handoff Files
Agents communicate via HANDOFF.yaml files, not shared context. Contains architecture summary, API contracts, implementation notes.

## Skills System

Skills in `.claude/skills/` are loaded based on agent's `skills:` field. Each skill is a markdown file with:
- Name (lowercase-with-hyphens)
- Description (what + when to use)
- Instructions and examples

## Workflow Engine

Workflows define:
- Sequential or parallel stage execution
- Agent assignments per stage
- Review gates (pause, notify, auto-approve)
- Handoff configuration between stages

Built-in workflows: feature, web-app-sdlc, bugfix, refactor

## Implementation Phases

The project is implemented in 9 phases (see docs/plan.md):
0. Conversational REPL & Chat Handler
1. Project Foundation & CLI Skeleton
2. Infrastructure (SQLite, Git worktrees, Sessions)
3. Domain Entities & Core Types
4. Agent Spawner & Process Management
5. Handoff System & Agent Communication
6. Basic TUI (Dashboard, Agent panels)
7. Interactive TUI (All commands, wizards)
8. Workflows & Orchestration
9. Polish & Integrations (GitHub, Linear, Slack)

## Key Files

- `docs/ARCHITECTURE.md`: Detailed architecture design with diagrams and code examples
- `docs/plan.md`: Implementation plan with 9 phases and task breakdowns
- `docs/ui.md`: ASCII UI wireframes and screen specifications
- `docs/requirements.md`: Project requirements and specifications
- `.claude/agents/`: Subagent definitions for development
- `.claude/skills/`: Project-specific skills for agents
