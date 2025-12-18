/**
 * Start Command
 *
 * Starts a new Claude Squad session in the current project.
 * Launches the interactive TUI with the Welcome Screen.
 */

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createElement } from "react";
import { loadConfig, isInitialized } from "../config/loader.js";
import { App } from "../../tui/app.js";
import { registerWelcomeScreen } from "../../tui/screens/welcome.js";

// Import commands module to register all built-in commands before TUI starts.
// This side-effect import ensures commands are available for autocomplete.
import "../../core/commands/definitions.js";

// ANSI colors for pre-TUI output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
} as const;

/**
 * Main start command handler
 *
 * Launches the OpenTUI application with the Welcome Screen.
 */
export async function startCommand(): Promise<void> {
  // Register screens before rendering
  registerWelcomeScreen();

  // Check initialization status
  const initialized = await isInitialized();

  // Load config if initialized (for project name, etc.)
  let projectName: string | undefined;
  let projectPath = process.cwd();

  if (initialized) {
    try {
      const configResult = await loadConfig();
      projectName = configResult.config.projectName;
      projectPath = configResult.projectPath;
    } catch {
      // Config loading failed, continue with defaults
    }
  }

  // Create the TUI renderer
  let renderer;
  try {
    renderer = await createCliRenderer();
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset} Failed to create TUI renderer.`);
    console.error(`${colors.yellow}Tip:${colors.reset} Make sure your terminal supports the required features.`);
    if (error instanceof Error) {
      console.error(`${colors.cyan}Details:${colors.reset} ${error.message}`);
    }
    process.exit(1);
  }

  // Create the root and render the app
  const root = createRoot(renderer);

  // Render the App component
  root.render(
    createElement(App, {
      state: {
        sessionName: projectName,
        status: initialized ? "Ready" : "Not initialized",
        statusType: initialized ? "success" : "warning",
      },
      initialParams: {
        isInitialized: initialized,
        projectPath: projectPath,
      },
      onExit: () => {
        console.log("\nGoodbye! 👋");
        process.exit(0);
      },
    })
  );

  // The TUI will now keep running until the user exits (Ctrl+C)
  // OpenTUI handles the event loop automatically
}
