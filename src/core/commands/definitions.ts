/**
 * Command Definitions
 *
 * Registers all built-in slash commands with the command router.
 * This file should be imported early in the application lifecycle
 * to ensure commands are available for autocomplete and execution.
 *
 * Commands are organized by category:
 * - Session: /sessions, /pause, /resume, /stop
 * - Feature: /feature, /complete, /approve, /reject
 * - Agent: /agents, /spawn, /message
 * - Config: /config, /skills, /workflows, /integrations
 * - Info: /status, /dashboard, /cost, /help
 * - System: /init, /exit, /clear
 */

import type { CommandDefinition, CommandResult } from "./types.js";
import { commandRouter } from "./router.js";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a success result with a message.
 */
function success(message: string, data?: unknown): CommandResult {
  return { success: true, message, data };
}

/**
 * Create an error result.
 */
function error(message: string, suggestions?: string[]): CommandResult {
  return { success: false, error: message, suggestions };
}

// ============================================================================
// Session Commands
// ============================================================================

const sessionsCommand: CommandDefinition = {
  name: "sessions",
  aliases: ["session"],
  description: "Manage sessions",
  longDescription: `View, resume, archive, or delete sessions.

Subcommands:
  list      Show all sessions (default)
  resume    Resume a paused session
  archive   Archive a completed session
  delete    Permanently delete a session`,
  category: "session",
  arguments: [
    {
      name: "action",
      type: "string",
      description: "Subcommand: list, resume, archive, delete",
      positional: true,
      choices: ["list", "resume", "archive", "delete"],
    },
    {
      name: "id",
      type: "string",
      description: "Session ID (required for resume, archive, delete)",
      positional: true,
    },
  ],
  examples: [
    "/sessions",
    "/sessions list",
    "/sessions resume ses_abc123",
    "/sessions archive ses_abc123",
    "/sessions delete ses_abc123",
  ],
  handler: async (args, _context) => {
    const action = (args.positional[0] as string) || "list";
    const sessionId = args.positional[1] as string | undefined;

    switch (action) {
      case "list":
        return success("Showing all sessions...", { action: "navigate", screen: "sessions" });

      case "resume":
        if (!sessionId) {
          return error("Session ID required. Usage: /sessions resume <session_id>");
        }
        return success(`Resuming session ${sessionId}...`, { action: "resume", sessionId });

      case "archive":
        if (!sessionId) {
          return error("Session ID required. Usage: /sessions archive <session_id>");
        }
        return success(`Archiving session ${sessionId}...`, { action: "archive", sessionId });

      case "delete":
        if (!sessionId) {
          return error("Session ID required. Usage: /sessions delete <session_id>");
        }
        return success(`Deleting session ${sessionId}...`, { action: "delete", sessionId });

      default:
        return error(`Unknown action: ${action}`, ["list", "resume", "archive", "delete"]);
    }
  },
};

const pauseCommand: CommandDefinition = {
  name: "pause",
  description: "Pause all active agents",
  longDescription: "Pauses all running agents in the current session. Agents can be resumed with /resume.",
  category: "session",
  examples: ["/pause"],
  handler: async (_args, context) => {
    if (!context.sessionId) {
      return error("No active session. Start a feature first with /feature <description>");
    }
    return success("Pausing all agents...", { action: "pause" });
  },
};

const resumeCommand: CommandDefinition = {
  name: "resume",
  aliases: ["unpause", "continue"],
  description: "Resume paused agents",
  longDescription: "Resumes all paused agents in the current session.",
  category: "session",
  examples: ["/resume"],
  handler: async (_args, context) => {
    if (!context.sessionId) {
      return error("No active session to resume.");
    }
    return success("Resuming all agents...", { action: "resume" });
  },
};

const stopCommand: CommandDefinition = {
  name: "stop",
  description: "Stop the current session",
  longDescription: "Stops all agents and ends the current session. Progress is saved and can be resumed later.",
  category: "session",
  arguments: [
    {
      name: "force",
      type: "boolean",
      description: "Force stop without confirmation",
      aliases: ["f"],
    },
  ],
  examples: ["/stop", "/stop --force"],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return error("No active session to stop.");
    }
    const force = args.flags.has("force") || args.flags.has("f");
    if (force) {
      return success("Session stopped.", { action: "stop", force: true });
    }
    return success("Stop session? Use /stop --force to confirm.", { action: "confirm_stop" });
  },
};

// ============================================================================
// Feature Commands
// ============================================================================

const featureCommand: CommandDefinition = {
  name: "feature",
  aliases: ["f", "start"],
  description: "Start a new feature",
  longDescription: `Start working on a new feature with AI agents.

Describe what you want to build and Claude Squad will:
1. Create a plan with the architect agent
2. Spawn appropriate agents for implementation
3. Coordinate work through the configured workflow`,
  category: "feature",
  arguments: [
    {
      name: "description",
      type: "string",
      description: "Description of the feature to build",
      required: true,
      positional: true,
    },
    {
      name: "workflow",
      type: "string",
      description: "Workflow to use",
      choices: ["feature", "bugfix", "refactor", "web-app-sdlc"],
    },
    {
      name: "agents",
      type: "array",
      description: "Specific agents to use (comma-separated)",
    },
  ],
  examples: [
    '/feature "Add user authentication"',
    '/feature "Fix login bug" --workflow bugfix',
    '/feature "Build dashboard" --agents architect,frontend-engineer',
  ],
  handler: async (args, _context) => {
    const description = args.positional.join(" ").trim();

    if (!description) {
      return error("Please provide a feature description. Usage: /feature <description>");
    }

    const workflow = args.named.workflow as string | undefined;
    const agents = args.named.agents as string[] | undefined;

    return success(`Starting feature: "${description}"`, {
      action: "start_feature",
      description,
      workflow: workflow || "feature",
      agents,
    });
  },
};

const completeCommand: CommandDefinition = {
  name: "complete",
  aliases: ["done", "finish"],
  description: "Mark current feature as complete",
  longDescription: `Mark the current feature as complete and prepare for merge.

This will:
1. Run final tests and linting
2. Generate a summary of all changes
3. Create a pull request (if configured)
4. Archive the session`,
  category: "feature",
  arguments: [
    {
      name: "skip-tests",
      type: "boolean",
      description: "Skip running tests before completion",
    },
    {
      name: "no-pr",
      type: "boolean",
      description: "Skip creating a pull request",
    },
  ],
  examples: ["/complete", "/complete --skip-tests", "/complete --no-pr"],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return error("No active feature to complete.");
    }

    const skipTests = args.flags.has("skip-tests");
    const noPr = args.flags.has("no-pr");

    return success("Completing feature...", {
      action: "complete_feature",
      skipTests,
      createPr: !noPr,
    });
  },
};

const approveCommand: CommandDefinition = {
  name: "approve",
  description: "Approve current review gate",
  longDescription: "Approve the current review gate and allow agents to proceed to the next stage.",
  category: "feature",
  arguments: [
    {
      name: "message",
      type: "string",
      description: "Optional approval message",
      positional: true,
    },
  ],
  examples: ["/approve", '/approve "Looks good, proceed with implementation"'],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return error("No active session with a review gate.");
    }

    const message = args.positional.join(" ").trim() || undefined;

    return success("Review gate approved.", {
      action: "approve_gate",
      message,
    });
  },
};

const rejectCommand: CommandDefinition = {
  name: "reject",
  description: "Reject current review gate",
  longDescription: "Reject the current review gate and send feedback to agents for revision.",
  category: "feature",
  arguments: [
    {
      name: "reason",
      type: "string",
      description: "Reason for rejection (recommended)",
      positional: true,
      required: true,
    },
  ],
  examples: ['/reject "Need more error handling in auth service"'],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return error("No active session with a review gate.");
    }

    const reason = args.positional.join(" ").trim();

    if (!reason) {
      return error("Please provide a reason for rejection. Usage: /reject <reason>");
    }

    return success("Review gate rejected. Sending feedback to agents.", {
      action: "reject_gate",
      reason,
    });
  },
};

// ============================================================================
// Agent Commands
// ============================================================================

const agentsCommand: CommandDefinition = {
  name: "agents",
  aliases: ["agent"],
  description: "Manage agents",
  longDescription: `View, create, edit, or delete agent definitions.

Subcommands:
  list      Show all agents (default)
  create    Create a new custom agent
  edit      Edit an existing agent
  delete    Delete an agent
  show      Show details for a specific agent`,
  category: "agent",
  arguments: [
    {
      name: "action",
      type: "string",
      description: "Subcommand: list, create, edit, delete, show",
      positional: true,
      choices: ["list", "create", "edit", "delete", "show"],
    },
    {
      name: "name",
      type: "string",
      description: "Agent name (for create, edit, delete, show)",
      positional: true,
    },
  ],
  examples: [
    "/agents",
    "/agents list",
    "/agents create",
    "/agents edit backend-engineer",
    "/agents show architect",
    "/agents delete my-custom-agent",
  ],
  handler: async (args, _context) => {
    const action = (args.positional[0] as string) || "list";
    const name = args.positional[1] as string | undefined;

    switch (action) {
      case "list":
        return success("Showing all agents...", { action: "navigate", screen: "agents" });

      case "create":
        return success("Opening agent creation wizard...", { action: "wizard", wizard: "create-agent" });

      case "edit":
        if (!name) {
          return error("Agent name required. Usage: /agents edit <name>");
        }
        return success(`Editing agent ${name}...`, { action: "wizard", wizard: "edit-agent", name });

      case "show":
        if (!name) {
          return error("Agent name required. Usage: /agents show <name>");
        }
        return success(`Showing agent ${name}...`, { action: "show_agent", name });

      case "delete":
        if (!name) {
          return error("Agent name required. Usage: /agents delete <name>");
        }
        return success(`Deleting agent ${name}...`, { action: "delete_agent", name });

      default:
        return error(`Unknown action: ${action}`, ["list", "create", "edit", "delete", "show"]);
    }
  },
};

const spawnCommand: CommandDefinition = {
  name: "spawn",
  description: "Spawn a specific agent",
  longDescription: "Manually spawn an agent to work on a specific task within the current session.",
  category: "agent",
  arguments: [
    {
      name: "agent",
      type: "string",
      description: "Agent name to spawn",
      required: true,
      positional: true,
    },
    {
      name: "task",
      type: "string",
      description: "Task description for the agent",
      positional: true,
    },
  ],
  examples: [
    "/spawn backend-engineer",
    '/spawn frontend-engineer "Build the login form"',
    '/spawn qa-engineer "Write tests for auth module"',
  ],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return error("No active session. Start a feature first with /feature <description>");
    }

    const agentName = args.positional[0] as string | undefined;

    if (!agentName) {
      return error("Agent name required. Usage: /spawn <agent-name> [task]");
    }

    const task = args.positional.slice(1).join(" ").trim() || undefined;

    return success(`Spawning agent ${agentName}...`, {
      action: "spawn_agent",
      agent: agentName,
      task,
    });
  },
};

const messageCommand: CommandDefinition = {
  name: "message",
  aliases: ["msg", "tell"],
  description: "Send a message to an agent",
  longDescription: "Send a direct message to a specific agent. You can also use @agent syntax.",
  category: "agent",
  arguments: [
    {
      name: "agent",
      type: "string",
      description: "Agent name or @mention",
      required: true,
      positional: true,
    },
    {
      name: "message",
      type: "string",
      description: "Message to send",
      required: true,
      positional: true,
    },
  ],
  examples: [
    '/message backend "Add input validation"',
    '/tell frontend "Use the new design system"',
    '/msg qa "Focus on edge cases"',
  ],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return error("No active session. Start a feature first.");
    }

    const agentName = args.positional[0] as string | undefined;
    const message = args.positional.slice(1).join(" ").trim();

    if (!agentName) {
      return error("Agent name required. Usage: /message <agent> <message>");
    }

    if (!message) {
      return error("Message required. Usage: /message <agent> <message>");
    }

    return success(`Message sent to ${agentName}.`, {
      action: "message_agent",
      agent: agentName.replace(/^@/, ""),
      message,
    });
  },
};

// ============================================================================
// Configuration Commands
// ============================================================================

const configCommand: CommandDefinition = {
  name: "config",
  aliases: ["settings", "cfg"],
  description: "Manage configuration",
  longDescription: `View and modify Claude Squad configuration.

Subcommands:
  show      Show current configuration (default)
  set       Set a configuration value
  reset     Reset to default values`,
  category: "config",
  arguments: [
    {
      name: "action",
      type: "string",
      description: "Subcommand: show, set, reset",
      positional: true,
      choices: ["show", "set", "reset"],
    },
    {
      name: "key",
      type: "string",
      description: "Configuration key (for set)",
      positional: true,
    },
    {
      name: "value",
      type: "string",
      description: "Configuration value (for set)",
      positional: true,
    },
  ],
  examples: [
    "/config",
    "/config show",
    "/config set defaults.model opus",
    "/config set defaults.maxConcurrentAgents 3",
    "/config reset",
  ],
  handler: async (args, _context) => {
    const action = (args.positional[0] as string) || "show";
    const key = args.positional[1] as string | undefined;
    const value = args.positional[2] as string | undefined;

    switch (action) {
      case "show":
        return success("Current configuration:", { action: "show_config" });

      case "set":
        if (!key || !value) {
          return error("Key and value required. Usage: /config set <key> <value>");
        }
        return success(`Setting ${key} = ${value}`, { action: "set_config", key, value });

      case "reset":
        return success("Resetting configuration to defaults...", { action: "reset_config" });

      default:
        return error(`Unknown action: ${action}`, ["show", "set", "reset"]);
    }
  },
};

const skillsCommand: CommandDefinition = {
  name: "skills",
  aliases: ["skill"],
  description: "Manage skills",
  longDescription: `View, create, edit, or delete skill definitions.

Skills are reusable knowledge/capability modules that can be assigned to agents.

Subcommands:
  list      Show all skills (default)
  create    Create a new skill
  edit      Edit an existing skill
  delete    Delete a skill
  show      Show details for a specific skill`,
  category: "config",
  arguments: [
    {
      name: "action",
      type: "string",
      description: "Subcommand: list, create, edit, delete, show",
      positional: true,
      choices: ["list", "create", "edit", "delete", "show"],
    },
    {
      name: "name",
      type: "string",
      description: "Skill name",
      positional: true,
    },
  ],
  examples: [
    "/skills",
    "/skills list",
    "/skills create",
    "/skills edit react-patterns",
    "/skills show api-design",
    "/skills delete my-skill",
  ],
  handler: async (args, _context) => {
    const action = (args.positional[0] as string) || "list";
    const name = args.positional[1] as string | undefined;

    switch (action) {
      case "list":
        return success("Showing all skills...", { action: "navigate", screen: "skills" });

      case "create":
        return success("Opening skill creation wizard...", { action: "wizard", wizard: "create-skill" });

      case "edit":
        if (!name) {
          return error("Skill name required. Usage: /skills edit <name>");
        }
        return success(`Editing skill ${name}...`, { action: "wizard", wizard: "edit-skill", name });

      case "show":
        if (!name) {
          return error("Skill name required. Usage: /skills show <name>");
        }
        return success(`Showing skill ${name}...`, { action: "show_skill", name });

      case "delete":
        if (!name) {
          return error("Skill name required. Usage: /skills delete <name>");
        }
        return success(`Deleting skill ${name}...`, { action: "delete_skill", name });

      default:
        return error(`Unknown action: ${action}`, ["list", "create", "edit", "delete", "show"]);
    }
  },
};

const workflowsCommand: CommandDefinition = {
  name: "workflows",
  aliases: ["workflow", "wf"],
  description: "Manage workflows",
  longDescription: `View, create, edit, or delete workflow definitions.

Workflows define the stages, agents, and review gates for feature development.

Subcommands:
  list      Show all workflows (default)
  create    Create a new workflow
  edit      Edit an existing workflow
  delete    Delete a workflow
  show      Show details for a specific workflow`,
  category: "config",
  arguments: [
    {
      name: "action",
      type: "string",
      description: "Subcommand: list, create, edit, delete, show",
      positional: true,
      choices: ["list", "create", "edit", "delete", "show"],
    },
    {
      name: "name",
      type: "string",
      description: "Workflow name",
      positional: true,
    },
  ],
  examples: [
    "/workflows",
    "/workflows list",
    "/workflows create",
    "/workflows edit feature",
    "/workflows show bugfix",
    "/workflows delete my-workflow",
  ],
  handler: async (args, _context) => {
    const action = (args.positional[0] as string) || "list";
    const name = args.positional[1] as string | undefined;

    switch (action) {
      case "list":
        return success("Showing all workflows...", { action: "navigate", screen: "workflows" });

      case "create":
        return success("Opening workflow creation wizard...", { action: "wizard", wizard: "create-workflow" });

      case "edit":
        if (!name) {
          return error("Workflow name required. Usage: /workflows edit <name>");
        }
        return success(`Editing workflow ${name}...`, { action: "wizard", wizard: "edit-workflow", name });

      case "show":
        if (!name) {
          return error("Workflow name required. Usage: /workflows show <name>");
        }
        return success(`Showing workflow ${name}...`, { action: "show_workflow", name });

      case "delete":
        if (!name) {
          return error("Workflow name required. Usage: /workflows delete <name>");
        }
        return success(`Deleting workflow ${name}...`, { action: "delete_workflow", name });

      default:
        return error(`Unknown action: ${action}`, ["list", "create", "edit", "delete", "show"]);
    }
  },
};

const integrationsCommand: CommandDefinition = {
  name: "integrations",
  aliases: ["integration", "int"],
  description: "Manage integrations",
  longDescription: `View, add, remove, or configure external integrations.

Supported integrations:
  - GitHub (source control, PRs, issues)
  - Linear (issue tracking)
  - Jira (issue tracking)
  - Slack (notifications)
  - Discord (notifications)

Subcommands:
  list       Show all integrations (default)
  add        Add a new integration
  remove     Remove an integration
  configure  Configure an integration
  test       Test integration connection`,
  category: "config",
  arguments: [
    {
      name: "action",
      type: "string",
      description: "Subcommand: list, add, remove, configure, test",
      positional: true,
      choices: ["list", "add", "remove", "configure", "test"],
    },
    {
      name: "name",
      type: "string",
      description: "Integration name",
      positional: true,
    },
  ],
  examples: [
    "/integrations",
    "/integrations list",
    "/integrations add github",
    "/integrations configure linear",
    "/integrations test slack",
    "/integrations remove discord",
  ],
  handler: async (args, _context) => {
    const action = (args.positional[0] as string) || "list";
    const name = args.positional[1] as string | undefined;

    switch (action) {
      case "list":
        return success("Showing all integrations...", { action: "navigate", screen: "integrations" });

      case "add":
        if (!name) {
          return error("Integration name required. Usage: /integrations add <name>", [
            "github",
            "linear",
            "jira",
            "slack",
            "discord",
          ]);
        }
        return success(`Adding ${name} integration...`, { action: "wizard", wizard: "add-integration", name });

      case "configure":
        if (!name) {
          return error("Integration name required. Usage: /integrations configure <name>");
        }
        return success(`Configuring ${name}...`, { action: "wizard", wizard: "configure-integration", name });

      case "test":
        if (!name) {
          return error("Integration name required. Usage: /integrations test <name>");
        }
        return success(`Testing ${name} connection...`, { action: "test_integration", name });

      case "remove":
        if (!name) {
          return error("Integration name required. Usage: /integrations remove <name>");
        }
        return success(`Removing ${name} integration...`, { action: "remove_integration", name });

      default:
        return error(`Unknown action: ${action}`, ["list", "add", "remove", "configure", "test"]);
    }
  },
};

// ============================================================================
// Information Commands
// ============================================================================

const statusCommand: CommandDefinition = {
  name: "status",
  description: "Show current session status",
  longDescription: "Display the current status of all agents, stages, and overall progress.",
  category: "info",
  arguments: [
    {
      name: "verbose",
      type: "boolean",
      description: "Show detailed status",
      aliases: ["v"],
    },
  ],
  examples: ["/status", "/status --verbose"],
  handler: async (args, context) => {
    if (!context.sessionId) {
      return success("No active session. Use /feature to start one, or /sessions to view past sessions.", {
        action: "show_welcome",
      });
    }

    const verbose = args.flags.has("verbose") || args.flags.has("v");

    return success("Showing status...", { action: "show_status", verbose });
  },
};

const dashboardCommand: CommandDefinition = {
  name: "dashboard",
  aliases: ["dash", "d"],
  description: "Show the main dashboard",
  longDescription: "Navigate to the main dashboard showing all agents and current progress.",
  category: "info",
  examples: ["/dashboard", "/dash"],
  handler: async (_args, _context) => {
    return success("Opening dashboard...", { action: "navigate", screen: "dashboard" });
  },
};

const costCommand: CommandDefinition = {
  name: "cost",
  aliases: ["usage", "tokens"],
  description: "Show token usage and costs",
  longDescription: "Display token usage and estimated costs for the current session.",
  category: "info",
  arguments: [
    {
      name: "session",
      type: "string",
      description: "Session ID to check (defaults to current)",
    },
    {
      name: "detailed",
      type: "boolean",
      description: "Show per-agent breakdown",
    },
  ],
  examples: ["/cost", "/cost --detailed", "/cost --session ses_abc123"],
  handler: async (args, context) => {
    const sessionId = (args.named.session as string) || context.sessionId;
    const detailed = args.flags.has("detailed");

    if (!sessionId) {
      return success("No session specified. Total workspace usage: $0.00", { action: "show_cost", total: true });
    }

    return success("Showing cost breakdown...", { action: "show_cost", sessionId, detailed });
  },
};

const helpCommand: CommandDefinition = {
  name: "help",
  aliases: ["h", "?"],
  description: "Show help information",
  longDescription: "Display help for all commands or a specific command.",
  category: "info",
  arguments: [
    {
      name: "command",
      type: "string",
      description: "Command to get help for",
      positional: true,
    },
  ],
  examples: ["/help", "/help feature", "/help agents"],
  handler: async (args, _context) => {
    const commandName = args.positional[0] as string | undefined;

    if (commandName) {
      const help = commandRouter.getHelp(commandName);
      if (!help) {
        return error(`Unknown command: ${commandName}. Use /help to see all commands.`);
      }

      // Format detailed help
      let helpText = `\n/${help.name} - ${help.description}\n\n`;
      helpText += `Usage: ${help.usage}\n`;

      if (help.arguments.length > 0) {
        helpText += "\nArguments:\n";
        for (const arg of help.arguments) {
          const req = arg.required ? "(required)" : "(optional)";
          helpText += `  ${arg.name} ${req}\n`;
          if (arg.description) {
            helpText += `    ${arg.description}\n`;
          }
        }
      }

      if (help.examples.length > 0) {
        helpText += "\nExamples:\n";
        for (const example of help.examples) {
          helpText += `  ${example}\n`;
        }
      }

      return success(helpText, { action: "show_help", command: commandName });
    }

    // Show all commands
    const helpText = commandRouter.generateHelpText();
    return success(helpText, { action: "show_help" });
  },
};

// ============================================================================
// System Commands
// ============================================================================

const initCommand: CommandDefinition = {
  name: "init",
  aliases: ["initialize", "setup"],
  description: "Initialize Claude Squad for this project",
  longDescription: `Initialize Claude Squad in the current directory.

This will:
1. Analyze your project (if existing code)
2. Recommend agents and workflows
3. Create .claude/squad.yaml configuration
4. Set up agent and skill directories`,
  category: "system",
  arguments: [
    {
      name: "force",
      type: "boolean",
      description: "Overwrite existing configuration",
      aliases: ["f"],
    },
  ],
  examples: ["/init", "/init --force"],
  handler: async (args, _context) => {
    const force = args.flags.has("force") || args.flags.has("f");

    return success("Starting initialization wizard...", {
      action: "wizard",
      wizard: "init",
      force,
    });
  },
};

const exitCommand: CommandDefinition = {
  name: "exit",
  aliases: ["quit", "q"],
  description: "Exit Claude Squad",
  longDescription: "Exit the application. Active sessions will be saved automatically.",
  category: "system",
  arguments: [
    {
      name: "force",
      type: "boolean",
      description: "Exit without confirmation",
      aliases: ["f"],
    },
  ],
  examples: ["/exit", "/quit", "/exit --force"],
  handler: async (args, context) => {
    const force = args.flags.has("force") || args.flags.has("f");

    if (context.sessionId && !force) {
      return success("Active session will be saved. Use /exit --force to confirm.", {
        action: "confirm_exit",
      });
    }

    return success("Goodbye!", { action: "exit" });
  },
};

const clearCommand: CommandDefinition = {
  name: "clear",
  aliases: ["cls"],
  description: "Clear the screen",
  longDescription: "Clear the terminal screen and message history.",
  category: "system",
  examples: ["/clear", "/cls"],
  handler: async (_args, _context) => {
    return success("", { action: "clear_screen" });
  },
};

// ============================================================================
// Command Registration
// ============================================================================

/**
 * All built-in command definitions.
 */
export const builtinCommands: CommandDefinition[] = [
  // Session
  sessionsCommand,
  pauseCommand,
  resumeCommand,
  stopCommand,

  // Feature
  featureCommand,
  completeCommand,
  approveCommand,
  rejectCommand,

  // Agent
  agentsCommand,
  spawnCommand,
  messageCommand,

  // Config
  configCommand,
  skillsCommand,
  workflowsCommand,
  integrationsCommand,

  // Info
  statusCommand,
  dashboardCommand,
  costCommand,
  helpCommand,

  // System
  initCommand,
  exitCommand,
  clearCommand,
];

/**
 * Register all built-in commands with the global router.
 * This function is called automatically when this module is imported.
 */
export function registerBuiltinCommands(): void {
  commandRouter.registerAll(builtinCommands);
}

// Auto-register commands when this module is imported
registerBuiltinCommands();
