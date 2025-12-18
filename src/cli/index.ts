#!/usr/bin/env bun
/**
 * Claude Squad CLI
 *
 * Main entry point for the Claude Squad command-line interface.
 * Parses arguments and routes to appropriate commands.
 */

import { parseArgs } from "util";
import { version, name } from "../../package.json";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
} as const;

/**
 * CLI Command definitions
 */
type Command = "start" | "resume" | "config" | "init" | "analyze" | "help";

interface ParsedArgs {
  command: Command | null;
  args: string[];
  options: {
    help: boolean;
    version: boolean;
    debug: boolean;
    cwd?: string;
    config?: string;
  };
}

/**
 * Display version information
 */
function showVersion(): void {
  console.log(`${colors.cyan}${name}${colors.reset} ${colors.dim}v${version}${colors.reset}`);
}

/**
 * Display help text
 */
function showHelp(command?: string): void {
  if (command) {
    showCommandHelp(command);
    return;
  }

  console.log(`
${colors.cyan}${colors.bold}Claude Squad${colors.reset} - Multi-agent AI orchestration for developers

${colors.yellow}USAGE${colors.reset}
  squad [command] [options]
  squad <message>              Start a conversation with Claude Squad

${colors.yellow}COMMANDS${colors.reset}
  ${colors.green}start${colors.reset}      Start a new Squad session in the current project
  ${colors.green}resume${colors.reset}     Resume a previous session
  ${colors.green}config${colors.reset}     View or modify configuration
  ${colors.green}init${colors.reset}       Initialize Claude Squad in a project (new or existing)
  ${colors.green}analyze${colors.reset}    Analyze project and suggest agents/workflows
  ${colors.green}help${colors.reset}       Show this help message

${colors.yellow}OPTIONS${colors.reset}
  ${colors.dim}-h, --help${colors.reset}      Show help information
  ${colors.dim}-v, --version${colors.reset}   Show version number
  ${colors.dim}-d, --debug${colors.reset}     Enable debug output
  ${colors.dim}--cwd <path>${colors.reset}    Set working directory
  ${colors.dim}--config <path>${colors.reset}  Path to config file

${colors.yellow}EXAMPLES${colors.reset}
  ${colors.dim}# Start Claude Squad in interactive mode${colors.reset}
  squad start

  ${colors.dim}# Initialize Squad in an existing project${colors.reset}
  squad init

  ${colors.dim}# Analyze project for recommended agents${colors.reset}
  squad analyze

  ${colors.dim}# View current configuration${colors.reset}
  squad config show

  ${colors.dim}# Resume a previous session${colors.reset}
  squad resume

${colors.yellow}SLASH COMMANDS (in REPL)${colors.reset}
  ${colors.green}/feature${colors.reset} <desc>   Start a new feature with description
  ${colors.green}/sessions${colors.reset}         List and manage sessions
  ${colors.green}/pause${colors.reset}            Pause all running agents
  ${colors.green}/resume${colors.reset}           Resume paused agents
  ${colors.green}/stop${colors.reset}             Stop all agents
  ${colors.green}/complete${colors.reset}         Complete feature and create PR
  ${colors.green}/agents${colors.reset}           Manage agent configurations
  ${colors.green}/skills${colors.reset}           Manage skill definitions
  ${colors.green}/workflows${colors.reset}        Manage workflow templates
  ${colors.green}/integrations${colors.reset}     Configure integrations
  ${colors.green}/help${colors.reset}             Show help for commands
  ${colors.green}/exit${colors.reset}             Exit Claude Squad

${colors.dim}For more information, visit: https://github.com/your-org/claude-squad${colors.reset}
`);
}

/**
 * Display help for a specific command
 */
function showCommandHelp(command: string): void {
  const commandHelp: Record<string, string> = {
    start: `
${colors.cyan}${colors.bold}squad start${colors.reset} - Start a new Squad session

${colors.yellow}USAGE${colors.reset}
  squad start [options]

${colors.yellow}DESCRIPTION${colors.reset}
  Starts a new Claude Squad session in the current project directory.
  If the project hasn't been initialized, you'll be prompted to run 'squad init' first.

${colors.yellow}OPTIONS${colors.reset}
  ${colors.dim}--cwd <path>${colors.reset}    Start in a specific directory
  ${colors.dim}--config <path>${colors.reset}  Use a specific config file

${colors.yellow}EXAMPLES${colors.reset}
  squad start
  squad start --cwd /path/to/project
`,
    resume: `
${colors.cyan}${colors.bold}squad resume${colors.reset} - Resume a previous session

${colors.yellow}USAGE${colors.reset}
  squad resume [session-id]

${colors.yellow}DESCRIPTION${colors.reset}
  Resumes a previous Claude Squad session. If no session ID is provided,
  shows a list of available sessions to choose from.

${colors.yellow}EXAMPLES${colors.reset}
  squad resume
  squad resume abc123
`,
    config: `
${colors.cyan}${colors.bold}squad config${colors.reset} - Configuration management

${colors.yellow}USAGE${colors.reset}
  squad config <action> [options]

${colors.yellow}ACTIONS${colors.reset}
  ${colors.green}show${colors.reset}     Display current configuration
  ${colors.green}set${colors.reset}      Set a configuration value
  ${colors.green}get${colors.reset}      Get a specific configuration value
  ${colors.green}path${colors.reset}     Show config file locations

${colors.yellow}EXAMPLES${colors.reset}
  squad config show
  squad config set defaults.model opus
  squad config get defaults.workflow
`,
    init: `
${colors.cyan}${colors.bold}squad init${colors.reset} - Initialize Claude Squad

${colors.yellow}USAGE${colors.reset}
  squad init [options]

${colors.yellow}DESCRIPTION${colors.reset}
  Initializes Claude Squad in a project. For existing projects, it detects
  the technology stack and configures appropriate agents. For new projects,
  it provides an AI-assisted wizard to scaffold the project structure.

${colors.yellow}OPTIONS${colors.reset}
  ${colors.dim}--new${colors.reset}        Start a new project (skip existing detection)
  ${colors.dim}--existing${colors.reset}   Initialize in existing project (skip new project wizard)

${colors.yellow}EXAMPLES${colors.reset}
  squad init
  squad init --new
`,
    analyze: `
${colors.cyan}${colors.bold}squad analyze${colors.reset} - Analyze project capabilities

${colors.yellow}USAGE${colors.reset}
  squad analyze [options]

${colors.yellow}DESCRIPTION${colors.reset}
  Scans the current project and provides recommendations for:
  - Agents suited to the detected technology stack
  - Skills that would be helpful
  - Workflows matching the project structure

${colors.yellow}OPTIONS${colors.reset}
  ${colors.dim}--json${colors.reset}       Output results as JSON
  ${colors.dim}--verbose${colors.reset}    Show detailed analysis

${colors.yellow}EXAMPLES${colors.reset}
  squad analyze
  squad analyze --json
`,
  };

  const help = commandHelp[command];
  if (help) {
    console.log(help);
  } else {
    console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
    console.log(`Run ${colors.cyan}squad help${colors.reset} for available commands.`);
    process.exit(1);
  }
}

/**
 * Parse command-line arguments
 */
function parseArguments(): ParsedArgs {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
      debug: { type: "boolean", short: "d", default: false },
      cwd: { type: "string" },
      config: { type: "string" },
      new: { type: "boolean" },
      existing: { type: "boolean" },
      json: { type: "boolean" },
      verbose: { type: "boolean" },
    },
    allowPositionals: true,
    strict: false,
  });

  const command = positionals[0] as Command | undefined;
  const args = positionals.slice(1);

  return {
    command: command ?? null,
    args,
    options: {
      help: Boolean(values.help),
      version: Boolean(values.version),
      debug: Boolean(values.debug),
      cwd: typeof values.cwd === "string" ? values.cwd : undefined,
      config: typeof values.config === "string" ? values.config : undefined,
    },
  };
}

/**
 * Print an error message and exit
 */
function exitWithError(message: string, code = 1): never {
  console.error(`${colors.red}Error:${colors.reset} ${message}`);
  process.exit(code);
}

/**
 * Print a success message
 */
export function printSuccess(message: string): void {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

/**
 * Print an info message
 */
function printInfo(message: string): void {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const parsed = parseArguments();

  // Handle --version flag
  if (parsed.options.version) {
    showVersion();
    process.exit(0);
  }

  // Handle --help flag
  if (parsed.options.help) {
    showHelp(parsed.command ?? undefined);
    process.exit(0);
  }

  // Set working directory if specified
  if (parsed.options.cwd) {
    try {
      process.chdir(parsed.options.cwd);
    } catch {
      exitWithError(`Cannot change to directory: ${parsed.options.cwd}`);
    }
  }

  // Route to appropriate command handler
  switch (parsed.command) {
    case "start":
      await handleStart(parsed);
      break;

    case "resume":
      await handleResume(parsed);
      break;

    case "config":
      await handleConfig(parsed);
      break;

    case "init":
      await handleInit(parsed);
      break;

    case "analyze":
      await handleAnalyze(parsed);
      break;

    case "help":
      showHelp(parsed.args[0]);
      break;

    case null:
      // No command - show help
      showHelp();
      break;

    default:
      exitWithError(`Unknown command: ${parsed.command}\nRun 'squad help' for available commands.`);
  }
}

/**
 * Command Handlers
 * These will be implemented fully in subsequent phases
 */

async function handleStart(_parsed: ParsedArgs): Promise<void> {
  // Dynamic import to enable code splitting
  const { startCommand } = await import("../app/commands/start.js");
  await startCommand();
}

async function handleResume(_parsed: ParsedArgs): Promise<void> {
  printInfo("Resume command not yet implemented (Phase 2)");
  printInfo("This will allow resuming previous Squad sessions.");
}

async function handleConfig(parsed: ParsedArgs): Promise<void> {
  const { configCommand } = await import("../app/commands/config.js");
  await configCommand(parsed.args);
}

async function handleInit(_parsed: ParsedArgs): Promise<void> {
  const { initCommand } = await import("../app/commands/init.js");
  await initCommand();
}

async function handleAnalyze(_parsed: ParsedArgs): Promise<void> {
  const { analyzeCommand } = await import("../app/commands/analyze.js");
  await analyzeCommand();
}

// Run the CLI
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  exitWithError(message);
});

// Export for testing
export { parseArguments, showHelp, showVersion, main };
export type { ParsedArgs, Command };
