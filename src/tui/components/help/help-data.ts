/**
 * Help Tree Data Structure
 *
 * Defines the hierarchical structure of help topics for the help system.
 * Includes categories, topics, and their content.
 */

import { HelpScreen } from "../../state/help-state.js";

// ============================================================================
// Types
// ============================================================================

/**
 * A help topic node in the tree.
 */
export interface HelpTopic {
  /** Unique identifier for the topic */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (displayed before label) */
  icon?: string;
  /** Screen to navigate to when selected */
  screen?: HelpScreen;
  /** Child topics (for categories) */
  children?: HelpTopic[];
  /** Whether this node is initially expanded */
  defaultExpanded?: boolean;
  /** Brief description shown in content area */
  description?: string;
  /** Full content lines for the topic */
  content?: string[];
  /** Related command (if this is a command topic) */
  command?: string;
  /** Keyboard shortcut (if applicable) */
  shortcut?: string;
}

/**
 * Command category for grouping.
 */
export type CommandCategory =
  | "session"
  | "feature"
  | "agent"
  | "config"
  | "info"
  | "system";

// ============================================================================
// Help Topic Tree Data
// ============================================================================

/**
 * Complete help topics tree structure.
 */
export const HELP_TOPICS: HelpTopic[] = [
  // -------------------------------------------------------------------------
  // Getting Started
  // -------------------------------------------------------------------------
  {
    id: "getting-started",
    label: "Getting Started",
    icon: "\u2605", // Star
    defaultExpanded: true,
    screen: HelpScreen.GETTING_STARTED,
    description: "Learn how to use Claude Squad effectively",
    content: [
      "Getting Started with Claude Squad",
      "==================================",
      "",
      "Claude Squad transforms you into an AI-powered development team.",
      "Multiple specialized agents work in parallel on different aspects",
      "of your project, each with isolated context and git worktrees.",
      "",
      "Choose a topic from the tree to learn more:",
      "",
      "  Quick Start Guide     - Get up and running in 5 minutes",
      "  Your First Feature    - Step-by-step feature walkthrough",
      "  Understanding Workflows - How agents collaborate",
      "",
      "Use arrow keys to navigate the tree on the left.",
      "Press Enter to select a topic and view its content.",
    ],
    children: [
      {
        id: "quick-start",
        label: "Quick Start Guide",
        icon: "\u26A1", // Lightning
        screen: HelpScreen.QUICK_START,
        description: "Get up and running with Claude Squad in 5 minutes",
        content: [
          "Quick Start Guide",
          "=================",
          "",
          "Welcome to Claude Squad! This guide will help you get started quickly.",
          "",
          "1. Initialize Your Project",
          "   Run /init to set up Claude Squad for your project.",
          "   This creates the .claude/squad.yaml configuration file.",
          "",
          "2. Start Your First Feature",
          '   Run /feature "Add user authentication" to begin.',
          "   The Prime Orchestrator will create a plan for you.",
          "",
          "3. Monitor Progress",
          "   Watch agents work in the dashboard.",
          "   Press 1-9 to focus on specific agents.",
          "",
          "4. Review and Approve",
          "   When agents reach review gates, use /approve or /reject.",
          "   Add feedback to guide the implementation.",
          "",
          "5. Complete the Feature",
          "   Run /complete when ready to merge.",
          "   A pull request will be created automatically.",
        ],
      },
      {
        id: "first-feature",
        label: "Your First Feature",
        icon: "\u2728", // Sparkles
        screen: HelpScreen.FIRST_FEATURE,
        description: "Step-by-step walkthrough of implementing a feature",
        content: [
          "Your First Feature",
          "==================",
          "",
          "Let's walk through implementing a complete feature.",
          "",
          "Step 1: Describe What You Want",
          "------------------------------",
          '  /feature "Add a contact form to the website"',
          "",
          "  Be specific about requirements:",
          '  /feature "Add contact form with name, email, message fields.',
          '            Validate inputs and send to API endpoint."',
          "",
          "Step 2: Review the Plan",
          "-----------------------",
          "  The architect agent creates a plan.",
          "  Review the proposed stages and agents.",
          "  Use /approve to proceed or /reject with feedback.",
          "",
          "Step 3: Monitor Implementation",
          "------------------------------",
          "  Agents work in parallel across stages.",
          "  Use number keys (1-9) to focus on specific agents.",
          "  Send guidance with /message @agent 'your message'",
          "",
          "Step 4: Handle Review Gates",
          "---------------------------",
          "  At review gates, examine the work done.",
          "  /approve - Continue to next stage",
          "  /reject - Request revisions",
          "",
          "Step 5: Complete and Merge",
          "--------------------------",
          "  When all stages complete:",
          "  /complete - Creates PR and archives session",
        ],
      },
      {
        id: "understanding-workflows",
        label: "Understanding Workflows",
        icon: "\u21BB", // Cycle arrow
        screen: HelpScreen.UNDERSTANDING_WORKFLOWS,
        description: "Learn how workflows orchestrate multi-agent development",
        content: [
          "Understanding Workflows",
          "=======================",
          "",
          "Workflows define how agents collaborate on features.",
          "",
          "What is a Workflow?",
          "-------------------",
          "A workflow is a sequence of stages, each with:",
          "  - Assigned agents (by skill)",
          "  - Dependencies on other stages",
          "  - Review gates for quality control",
          "",
          "Built-in Workflows",
          "------------------",
          "",
          "1. feature (default)",
          "   Stages: Design -> Backend -> Frontend -> Testing -> Docs",
          "   Best for: New features requiring full-stack work",
          "",
          "2. bugfix",
          "   Stages: Investigate -> Fix -> Test",
          "   Best for: Bug fixes and patches",
          "",
          "3. refactor",
          "   Stages: Analyze -> Refactor -> Test -> Review",
          "   Best for: Code improvements and cleanup",
          "",
          "4. web-app-sdlc",
          "   Stages: Requirements -> Design -> Develop -> QA -> Deploy",
          "   Best for: Full software development lifecycle",
          "",
          "Creating Custom Workflows",
          "-------------------------",
          "Use /workflows create to define your own.",
          "Customize stages, agents, and review gates.",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Commands Reference
  // -------------------------------------------------------------------------
  {
    id: "commands",
    label: "Commands Reference",
    icon: "\u2318", // Command symbol
    defaultExpanded: false,
    screen: HelpScreen.COMMANDS,
    description: "Complete reference for all available commands",
    content: [
      "Commands Reference",
      "==================",
      "",
      "Claude Squad provides commands for managing your development workflow.",
      "All commands start with / and can be typed in the command prompt.",
      "",
      "Command Categories:",
      "",
      "  Session Commands  - Manage sessions (pause, resume, stop)",
      "  Feature Commands  - Start and complete features",
      "  Agent Commands    - Interact with AI agents",
      "  Config Commands   - Configure settings and integrations",
      "  Info Commands     - View status and help",
      "  System Commands   - Initialize and exit",
      "",
      "Expand each category to see individual commands.",
      "Use /help <command> for quick help in the terminal.",
    ],
    children: [
      {
        id: "commands-session",
        label: "Session Commands",
        icon: "\u23F1", // Timer
        children: [
          {
            id: "cmd-sessions",
            label: "/sessions",
            command: "sessions",
            description: "View, resume, archive, or delete sessions",
            content: [
              "/sessions - Manage sessions",
              "",
              "Usage:",
              "  /sessions              List all sessions",
              "  /sessions list         List all sessions",
              "  /sessions resume <id>  Resume a paused session",
              "  /sessions archive <id> Archive a completed session",
              "  /sessions delete <id>  Permanently delete a session",
            ],
          },
          {
            id: "cmd-pause",
            label: "/pause",
            command: "pause",
            description: "Pause all active agents",
            content: [
              "/pause - Pause all active agents",
              "",
              "Pauses all running agents in the current session.",
              "Agents can be resumed with /resume.",
              "",
              "Usage: /pause",
            ],
          },
          {
            id: "cmd-resume",
            label: "/resume",
            command: "resume",
            description: "Resume paused agents",
            content: [
              "/resume - Resume paused agents",
              "",
              "Aliases: /unpause, /continue",
              "",
              "Resumes all paused agents in the current session.",
              "",
              "Usage: /resume",
            ],
          },
          {
            id: "cmd-stop",
            label: "/stop",
            command: "stop",
            description: "Stop the current session",
            content: [
              "/stop - Stop the current session",
              "",
              "Stops all agents and ends the current session.",
              "Progress is saved and can be resumed later.",
              "",
              "Usage:",
              "  /stop         Stop with confirmation prompt",
              "  /stop --force Stop without confirmation",
            ],
          },
        ],
      },
      {
        id: "commands-feature",
        label: "Feature Commands",
        icon: "\u2728", // Sparkles
        children: [
          {
            id: "cmd-feature",
            label: "/feature",
            command: "feature",
            description: "Start a new feature",
            content: [
              "/feature - Start a new feature",
              "",
              "Aliases: /f, /start",
              "",
              "Start working on a new feature with AI agents.",
              "",
              "Usage:",
              '  /feature "description"',
              '  /feature "description" --workflow bugfix',
              '  /feature "description" --agents architect,frontend',
              "",
              "Options:",
              "  --workflow   Workflow to use (feature, bugfix, refactor)",
              "  --agents     Specific agents to use (comma-separated)",
            ],
          },
          {
            id: "cmd-complete",
            label: "/complete",
            command: "complete",
            description: "Mark current feature as complete",
            content: [
              "/complete - Mark current feature as complete",
              "",
              "Aliases: /done, /finish",
              "",
              "Completes the feature and prepares for merge:",
              "  1. Runs final tests and linting",
              "  2. Generates a summary of changes",
              "  3. Creates a pull request",
              "  4. Archives the session",
              "",
              "Options:",
              "  --skip-tests  Skip running tests",
              "  --no-pr       Skip creating a pull request",
            ],
          },
          {
            id: "cmd-approve",
            label: "/approve",
            command: "approve",
            description: "Approve current review gate",
            content: [
              "/approve - Approve current review gate",
              "",
              "Approves the current review gate and allows",
              "agents to proceed to the next stage.",
              "",
              "Usage:",
              "  /approve",
              '  /approve "Looks good, proceed"',
            ],
          },
          {
            id: "cmd-reject",
            label: "/reject",
            command: "reject",
            description: "Reject current review gate",
            content: [
              "/reject - Reject current review gate",
              "",
              "Rejects the current review gate and sends",
              "feedback to agents for revision.",
              "",
              "Usage:",
              '  /reject "Need more error handling"',
            ],
          },
        ],
      },
      {
        id: "commands-agent",
        label: "Agent Commands",
        icon: "\u2699", // Gear
        children: [
          {
            id: "cmd-agents",
            label: "/agents",
            command: "agents",
            description: "Manage agents",
            content: [
              "/agents - Manage agents",
              "",
              "View, create, edit, or delete agent definitions.",
              "",
              "Usage:",
              "  /agents              List all agents",
              "  /agents create       Create new agent",
              "  /agents edit <name>  Edit existing agent",
              "  /agents show <name>  Show agent details",
              "  /agents delete <name> Delete an agent",
            ],
          },
          {
            id: "cmd-spawn",
            label: "/spawn",
            command: "spawn",
            description: "Spawn a specific agent",
            content: [
              "/spawn - Spawn a specific agent",
              "",
              "Manually spawn an agent to work on a specific task.",
              "",
              "Usage:",
              "  /spawn backend-engineer",
              '  /spawn frontend-engineer "Build the login form"',
            ],
          },
          {
            id: "cmd-message",
            label: "/message",
            command: "message",
            description: "Send a message to an agent",
            content: [
              "/message - Send a message to an agent",
              "",
              "Aliases: /msg, /tell",
              "",
              "Send a direct message to a specific agent.",
              "",
              "Usage:",
              '  /message backend "Add input validation"',
              '  /msg frontend "Use the new design system"',
              "",
              "You can also use @mentions in chat:",
              '  @backend Add input validation',
            ],
          },
        ],
      },
      {
        id: "commands-config",
        label: "Config Commands",
        icon: "\u2692", // Hammer and wrench
        children: [
          {
            id: "cmd-config",
            label: "/config",
            command: "config",
            description: "Manage configuration",
            content: [
              "/config - Manage configuration",
              "",
              "Aliases: /settings, /cfg",
              "",
              "Usage:",
              "  /config                    Show config",
              "  /config set <key> <value>  Set a value",
              "  /config reset              Reset to defaults",
            ],
          },
          {
            id: "cmd-skills",
            label: "/skills",
            command: "skills",
            description: "Manage skills",
            content: [
              "/skills - Manage skills",
              "",
              "Skills are reusable knowledge modules for agents.",
              "",
              "Usage:",
              "  /skills              List all skills",
              "  /skills create       Create new skill",
              "  /skills edit <name>  Edit existing skill",
              "  /skills show <name>  Show skill details",
              "  /skills delete <name> Delete a skill",
            ],
          },
          {
            id: "cmd-workflows",
            label: "/workflows",
            command: "workflows",
            description: "Manage workflows",
            content: [
              "/workflows - Manage workflows",
              "",
              "Aliases: /workflow, /wf",
              "",
              "Workflows define stages, agents, and review gates.",
              "",
              "Usage:",
              "  /workflows              List all workflows",
              "  /workflows create       Create new workflow",
              "  /workflows edit <name>  Edit existing workflow",
              "  /workflows show <name>  Show workflow details",
            ],
          },
          {
            id: "cmd-integrations",
            label: "/integrations",
            command: "integrations",
            description: "Manage integrations",
            content: [
              "/integrations - Manage integrations",
              "",
              "Aliases: /integration, /int",
              "",
              "Configure external integrations:",
              "  - GitHub (PRs, issues)",
              "  - Linear (issue tracking)",
              "  - Jira (issue tracking)",
              "  - Slack (notifications)",
              "  - Discord (notifications)",
              "",
              "Usage:",
              "  /integrations              List all",
              "  /integrations add github   Add GitHub",
              "  /integrations test slack   Test connection",
            ],
          },
        ],
      },
      {
        id: "commands-info",
        label: "Info Commands",
        icon: "\u2139", // Info symbol
        children: [
          {
            id: "cmd-status",
            label: "/status",
            command: "status",
            description: "Show current session status",
            content: [
              "/status - Show current session status",
              "",
              "Display current status of all agents and stages.",
              "",
              "Usage:",
              "  /status           Show basic status",
              "  /status --verbose Show detailed status",
            ],
          },
          {
            id: "cmd-dashboard",
            label: "/dashboard",
            command: "dashboard",
            description: "Show the main dashboard",
            content: [
              "/dashboard - Show the main dashboard",
              "",
              "Aliases: /dash, /d",
              "",
              "Navigate to the main dashboard showing all",
              "agents and current progress.",
            ],
          },
          {
            id: "cmd-cost",
            label: "/cost",
            command: "cost",
            description: "Show token usage and costs",
            content: [
              "/cost - Show token usage and costs",
              "",
              "Aliases: /usage, /tokens",
              "",
              "Display token usage and estimated costs.",
              "",
              "Usage:",
              "  /cost              Current session cost",
              "  /cost --detailed   Per-agent breakdown",
              "  /cost --session <id> Specific session",
            ],
          },
          {
            id: "cmd-help",
            label: "/help",
            command: "help",
            description: "Show help information",
            content: [
              "/help - Show help information",
              "",
              "Aliases: /h, /?",
              "",
              "Display help for commands.",
              "",
              "Usage:",
              "  /help           Show all commands",
              "  /help feature   Help for /feature",
              "  /help agents    Help for /agents",
            ],
          },
        ],
      },
      {
        id: "commands-system",
        label: "System Commands",
        icon: "\u2328", // Keyboard
        children: [
          {
            id: "cmd-init",
            label: "/init",
            command: "init",
            description: "Initialize Claude Squad for this project",
            content: [
              "/init - Initialize Claude Squad",
              "",
              "Aliases: /initialize, /setup",
              "",
              "Set up Claude Squad for your project:",
              "  1. Analyzes your project structure",
              "  2. Recommends agents and workflows",
              "  3. Creates .claude/squad.yaml config",
              "",
              "Options:",
              "  --force  Overwrite existing configuration",
            ],
          },
          {
            id: "cmd-exit",
            label: "/exit",
            command: "exit",
            description: "Exit Claude Squad",
            content: [
              "/exit - Exit Claude Squad",
              "",
              "Aliases: /quit, /q",
              "",
              "Exit the application. Active sessions are saved.",
              "",
              "Options:",
              "  --force  Exit without confirmation",
            ],
          },
          {
            id: "cmd-clear",
            label: "/clear",
            command: "clear",
            description: "Clear the screen",
            content: [
              "/clear - Clear the screen",
              "",
              "Aliases: /cls",
              "",
              "Clear the terminal and message history.",
            ],
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Concepts
  // -------------------------------------------------------------------------
  {
    id: "concepts",
    label: "Concepts",
    icon: "\u2630", // Trigram
    defaultExpanded: false,
    description: "Core concepts and architecture of Claude Squad",
    content: [
      "Core Concepts",
      "=============",
      "",
      "Understanding these concepts will help you use Claude Squad effectively.",
      "",
      "Key Concepts:",
      "",
      "  Agents & Roles    - Specialized AI personas (architect, backend, etc.)",
      "  Skills            - Reusable knowledge modules assigned to agents",
      "  Workflow Stages   - Sequential/parallel execution phases",
      "  Review Gates      - Quality checkpoints between stages",
      "  Git Worktrees     - Isolated branches for parallel agent work",
      "",
      "Each agent works in isolation with minimal context,",
      "communicating via HANDOFF.yaml files between stages.",
      "",
      "Select a topic to learn more about each concept.",
    ],
    children: [
      {
        id: "concept-agents",
        label: "Agents & Roles",
        icon: "\u2699", // Gear
        screen: HelpScreen.CONCEPT_AGENTS,
        description: "Understanding AI agents and their specialized roles",
        content: [
          "Agents & Roles",
          "==============",
          "",
          "Agents are specialized AI personas with defined roles and capabilities.",
          "",
          "Built-in Agents",
          "---------------",
          "",
          "1. Prime Orchestrator",
          "   Role: Planning and coordination",
          "   Tasks: Creates feature plans, assigns work, monitors progress",
          "",
          "2. Architect",
          "   Role: System design",
          "   Tasks: API contracts, data models, architecture decisions",
          "",
          "3. Backend Engineer",
          "   Role: Server-side development",
          "   Tasks: APIs, business logic, database operations",
          "",
          "4. Frontend Engineer",
          "   Role: Client-side development",
          "   Tasks: UI components, state management, styling",
          "",
          "5. QA Engineer",
          "   Role: Quality assurance",
          "   Tasks: Writing tests, finding bugs, validating requirements",
          "",
          "6. DevOps Engineer",
          "   Role: Infrastructure",
          "   Tasks: CI/CD, deployment, monitoring setup",
          "",
          "Creating Custom Agents",
          "----------------------",
          "Use /agents create to define custom agents with:",
          "  - Specialized system prompts",
          "  - Specific allowed tools",
          "  - Custom skills",
        ],
      },
      {
        id: "concept-skills",
        label: "Skills",
        icon: "\u2726", // Four pointed star
        screen: HelpScreen.CONCEPT_SKILLS,
        description: "Reusable knowledge modules for agents",
        content: [
          "Skills",
          "======",
          "",
          "Skills are reusable knowledge/capability modules",
          "that can be assigned to agents.",
          "",
          "What are Skills?",
          "----------------",
          "Skills contain:",
          "  - Specialized knowledge (patterns, best practices)",
          "  - Instructions for specific tasks",
          "  - Code examples and templates",
          "",
          "Skill Categories",
          "----------------",
          "",
          "1. Framework Skills",
          "   React, Vue, Angular, Next.js, etc.",
          "",
          "2. Language Skills",
          "   TypeScript, Python, Go, Rust, etc.",
          "",
          "3. Domain Skills",
          "   API design, database patterns, testing strategies",
          "",
          "4. Tool Skills",
          "   Docker, Kubernetes, AWS, etc.",
          "",
          "Using Skills",
          "------------",
          "Skills are loaded based on agent's skills field.",
          "The agent receives skill instructions in its context.",
          "",
          "Creating Skills",
          "---------------",
          "Use /skills create to define custom skills.",
          "Skills are stored in .claude/skills/ as markdown files.",
        ],
      },
      {
        id: "concept-stages",
        label: "Workflow Stages",
        icon: "\u279C", // Arrow
        screen: HelpScreen.CONCEPT_STAGES,
        description: "Sequential and parallel execution phases",
        content: [
          "Workflow Stages",
          "===============",
          "",
          "Stages are execution phases in a workflow.",
          "",
          "Stage Properties",
          "----------------",
          "",
          "- Name: Display name for the stage",
          "- Skill: Required agent skill",
          "- Dependencies: Stages that must complete first",
          "- Review Gate: Quality checkpoint configuration",
          "",
          "Sequential vs Parallel",
          "----------------------",
          "",
          "Sequential: Stages run one after another",
          "  Design -> Backend -> Frontend -> Testing",
          "",
          "Parallel: Independent stages run simultaneously",
          "  Design",
          "    |-> Backend --|",
          "    |-> Frontend -|-> Testing",
          "",
          "Stage Execution",
          "---------------",
          "",
          "1. Stage becomes ready when dependencies complete",
          "2. Agent with matching skill is spawned",
          "3. Agent works in isolated git worktree",
          "4. On completion, handoff is written",
          "5. Review gate is triggered (if configured)",
          "6. Next stages can begin",
        ],
      },
      {
        id: "concept-gates",
        label: "Review Gates",
        icon: "\u2714", // Check mark
        screen: HelpScreen.CONCEPT_GATES,
        description: "Quality checkpoints for human or automated review",
        content: [
          "Review Gates",
          "============",
          "",
          "Review gates are quality checkpoints between stages.",
          "",
          "Gate Types",
          "----------",
          "",
          "1. Human Review (pause)",
          "   - Pauses workflow for human review",
          "   - User must /approve or /reject",
          "   - Best for: Architecture decisions, major changes",
          "",
          "2. Automated Review (auto-approve)",
          "   - Runs automated checks (tests, lint, types)",
          "   - Auto-approves if threshold met",
          "   - Best for: Routine code changes",
          "",
          "3. Notify Only (notify)",
          "   - Sends notification but continues",
          "   - No blocking",
          "   - Best for: Status updates",
          "",
          "4. No Gate (none)",
          "   - Proceeds immediately",
          "   - Best for: Intermediate stages",
          "",
          "Configuring Gates",
          "-----------------",
          "",
          "In workflow YAML:",
          "  stages:",
          "    - name: Backend",
          "      reviewGate:",
          "        type: automated",
          "        autoApproveThreshold: 80",
        ],
      },
      {
        id: "concept-worktrees",
        label: "Git Worktrees",
        icon: "\u2442", // OCR branch
        screen: HelpScreen.CONCEPT_WORKTREES,
        description: "How agents work in isolated git branches",
        content: [
          "Git Worktrees",
          "=============",
          "",
          "Each agent works in an isolated git worktree.",
          "",
          "What are Worktrees?",
          "-------------------",
          "",
          "Git worktrees allow multiple working directories",
          "linked to a single repository. Each agent can:",
          "  - Work on different branches simultaneously",
          "  - Avoid file conflicts with other agents",
          "  - Maintain separate change sets",
          "",
          "Worktree Lifecycle",
          "------------------",
          "",
          "1. Create: Agent spawns in .claude-squad/worktrees/<id>",
          "2. Branch: Creates squad/<agent-id> branch",
          "3. Work: Agent makes changes in isolation",
          "4. Commit: Changes committed to branch",
          "5. Merge: Branches merged after review",
          "6. Cleanup: Worktree removed on session end",
          "",
          "Benefits",
          "--------",
          "",
          "- No conflicts between parallel agents",
          "- Clean git history per agent",
          "- Easy rollback if needed",
          "- Parallel execution without interference",
          "",
          "Storage",
          "-------",
          "Worktrees are stored in .claude-squad/worktrees/",
          "They are cleaned up when sessions end.",
        ],
      },
    ],
  },

  // -------------------------------------------------------------------------
  // Keyboard Shortcuts
  // -------------------------------------------------------------------------
  {
    id: "shortcuts",
    label: "Keyboard Shortcuts",
    icon: "\u2328", // Keyboard
    screen: HelpScreen.SHORTCUTS,
    description: "Quick reference for all keyboard shortcuts",
    content: [
      "Keyboard Shortcuts",
      "==================",
      "",
      "Global Navigation",
      "-----------------",
      "  ?           Open help",
      "  Esc         Close modal / Go back",
      "  Tab         Switch focus panel",
      "  Ctrl+C      Exit / Cancel",
      "",
      "Dashboard",
      "---------",
      "  1-9         Focus agent by number",
      "  Up/Down     Navigate agent list",
      "  Enter       Select focused agent",
      "  /           Open command prompt",
      "",
      "Agent Panel",
      "-----------",
      "  j/k         Scroll output down/up",
      "  g           Go to start of output",
      "  G           Go to end of output",
      "  m           Message this agent",
      "  p           Pause agent",
      "  r           Resume agent",
      "",
      "List Navigation",
      "---------------",
      "  Up/Down     Move selection",
      "  Enter       Activate item",
      "  Home        Go to first item",
      "  End         Go to last item",
      "  PageUp/Down Scroll by page",
      "",
      "Command Prompt",
      "--------------",
      "  Tab         Autocomplete",
      "  Up/Down     Navigate history",
      "  Ctrl+U      Clear line",
      "  Enter       Execute command",
      "",
      "Help System",
      "-----------",
      "  ?           Open help",
      "  Esc         Close help / Go back",
      "  Tab         Switch tree/content focus",
      "  Enter       Expand/select topic",
      "  Space       Expand/collapse node",
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Flatten the help topics tree into a list.
 */
export function flattenTopics(
  topics: HelpTopic[],
  result: HelpTopic[] = []
): HelpTopic[] {
  for (const topic of topics) {
    result.push(topic);
    if (topic.children) {
      flattenTopics(topic.children, result);
    }
  }
  return result;
}

/**
 * Find a topic by ID.
 */
export function findTopicById(
  topics: HelpTopic[],
  id: string
): HelpTopic | null {
  for (const topic of topics) {
    if (topic.id === id) {
      return topic;
    }
    if (topic.children) {
      const found = findTopicById(topic.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get the path to a topic (breadcrumb).
 */
export function getTopicPath(
  topics: HelpTopic[],
  id: string,
  path: string[] = []
): string[] | null {
  for (const topic of topics) {
    const currentPath = [...path, topic.label];
    if (topic.id === id) {
      return currentPath;
    }
    if (topic.children) {
      const found = getTopicPath(topic.children, id, currentPath);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Get all topics that have content (are leaf nodes or have direct content).
 */
export function getContentTopics(topics: HelpTopic[]): HelpTopic[] {
  const result: HelpTopic[] = [];

  function traverse(topicList: HelpTopic[]) {
    for (const topic of topicList) {
      if (topic.content || topic.screen) {
        result.push(topic);
      }
      if (topic.children) {
        traverse(topic.children);
      }
    }
  }

  traverse(topics);
  return result;
}

/**
 * Search topics by query.
 */
export function searchTopics(
  topics: HelpTopic[],
  query: string
): HelpTopic[] {
  const lowerQuery = query.toLowerCase();
  const results: HelpTopic[] = [];

  function traverse(topicList: HelpTopic[]) {
    for (const topic of topicList) {
      const matchesLabel = topic.label.toLowerCase().includes(lowerQuery);
      const matchesDescription = topic.description
        ?.toLowerCase()
        .includes(lowerQuery);
      const matchesCommand = topic.command?.toLowerCase().includes(lowerQuery);

      if (matchesLabel || matchesDescription || matchesCommand) {
        results.push(topic);
      }

      if (topic.children) {
        traverse(topic.children);
      }
    }
  }

  traverse(topics);
  return results;
}

// ============================================================================
// Exports
// ============================================================================

export default HELP_TOPICS;
