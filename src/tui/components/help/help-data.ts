/**
 * Help Data - Slash Commands Reference
 *
 * Flat list of all available slash commands for the help system.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * A help topic (command) in the list.
 */
export interface HelpTopic {
  /** Unique identifier for the topic */
  id: string;
  /** Display label (command name) */
  label: string;
  /** Optional icon */
  icon?: string;
  /** Brief description shown in list */
  description?: string;
  /** Full content lines for the topic */
  content?: string[];
  /** Related command name */
  command?: string;
  /** Keyboard shortcut (if applicable) */
  shortcut?: string;
}

// ============================================================================
// Help Topics - Flat List of Slash Commands
// ============================================================================

/**
 * All slash commands as a flat list.
 */
export const HELP_TOPICS: HelpTopic[] = [
  // Session Commands
  {
    id: "cmd-sessions",
    label: "/sessions",
    command: "sessions",
    description: "Manage sessions",
    content: [
      "/sessions",
      "",
      "View, resume, archive, or delete sessions.",
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
      "/pause",
      "",
      "Pauses all running agents in the current session.",
      "Agents can be resumed with /resume.",
      "",
      "Usage:",
      "  /pause",
    ],
  },
  {
    id: "cmd-resume",
    label: "/resume",
    command: "resume",
    description: "Resume paused agents",
    content: [
      "/resume",
      "",
      "Aliases: /unpause, /continue",
      "",
      "Resumes all paused agents in the current session.",
      "",
      "Usage:",
      "  /resume",
    ],
  },
  {
    id: "cmd-stop",
    label: "/stop",
    command: "stop",
    description: "Stop the current session",
    content: [
      "/stop",
      "",
      "Stops all agents and ends the current session.",
      "Progress is saved and can be resumed later.",
      "",
      "Usage:",
      "  /stop         Stop with confirmation",
      "  /stop --force Stop without confirmation",
    ],
  },

  // Feature Commands
  {
    id: "cmd-feature",
    label: "/feature",
    command: "feature",
    description: "Start a new feature",
    content: [
      "/feature",
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
    description: "Mark feature as complete",
    content: [
      "/complete",
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
    description: "Approve review gate",
    content: [
      "/approve",
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
    description: "Reject review gate",
    content: [
      "/reject",
      "",
      "Rejects the current review gate and sends",
      "feedback to agents for revision.",
      "",
      "Usage:",
      '  /reject "Need more error handling"',
    ],
  },

  // Agent Commands
  {
    id: "cmd-agents",
    label: "/agents",
    command: "agents",
    description: "Manage agents",
    content: [
      "/agents",
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
      "/spawn",
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
    description: "Send message to agent",
    content: [
      "/message",
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
      "  @backend Add input validation",
    ],
  },

  // Config Commands
  {
    id: "cmd-config",
    label: "/config",
    command: "config",
    description: "Manage configuration",
    content: [
      "/config",
      "",
      "Aliases: /settings, /cfg",
      "",
      "View and modify configuration settings.",
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
      "/skills",
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
      "/workflows",
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
      "/integrations",
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

  // Info Commands
  {
    id: "cmd-status",
    label: "/status",
    command: "status",
    description: "Show session status",
    content: [
      "/status",
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
    description: "Show main dashboard",
    content: [
      "/dashboard",
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
      "/cost",
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
      "/help",
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

  // System Commands
  {
    id: "cmd-init",
    label: "/init",
    command: "init",
    description: "Initialize Claude Squad",
    content: [
      "/init",
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
      "/exit",
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
      "/clear",
      "",
      "Aliases: /cls",
      "",
      "Clear the terminal and message history.",
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find a topic by ID.
 */
export function findTopicById(
  topics: HelpTopic[],
  id: string
): HelpTopic | null {
  return topics.find((t) => t.id === id) || null;
}

/**
 * Find a topic by command name.
 */
export function findTopicByCommand(
  topics: HelpTopic[],
  command: string
): HelpTopic | null {
  return topics.find((t) => t.command === command) || null;
}

/**
 * Search topics by query.
 */
export function searchTopics(topics: HelpTopic[], query: string): HelpTopic[] {
  const lowerQuery = query.toLowerCase();
  return topics.filter((topic) => {
    const matchesLabel = topic.label.toLowerCase().includes(lowerQuery);
    const matchesDescription = topic.description
      ?.toLowerCase()
      .includes(lowerQuery);
    const matchesCommand = topic.command?.toLowerCase().includes(lowerQuery);
    return matchesLabel || matchesDescription || matchesCommand;
  });
}

// ============================================================================
// Exports
// ============================================================================

export default HELP_TOPICS;
