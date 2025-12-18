/**
 * TUI Application Shell
 *
 * Main application component that provides the layout structure
 * with header, content area, footer, and command prompt.
 */

import { useState, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import { Header } from "./components/header.js";
import { Footer } from "./components/footer.js";
import { CommandPrompt } from "./components/command-prompt.js";
import { ScreenRouter, RouterProvider, useRouter } from "./router.js";
import { getChatHandler } from "../app/chat/index.js";
import type { ChatResponse, AutocompleteResult } from "../app/chat/types.js";

/**
 * Application state from external sources
 */
export interface AppState {
  /** Current session name */
  sessionName?: string;
  /** Current feature name */
  featureName?: string;
  /** Total session cost */
  cost?: number;
  /** Status message */
  status?: string;
  /** Status type */
  statusType?: "info" | "success" | "warning" | "error";
  /** Debug mode */
  debug?: boolean;
}

/**
 * App props
 */
export interface AppProps {
  /** External state */
  state?: AppState;
  /** Initial screen parameters (passed to first screen) */
  initialParams?: Record<string, unknown>;
  /** Callback when exit is requested */
  onExit?: () => void;
}

/**
 * Main App Content
 *
 * Contains the actual layout with header, content, command prompt, and footer.
 */
function AppContent({ state = {}, onExit }: AppProps) {
  // Chat handler for processing commands
  const chatHandler = getChatHandler();
  const router = useRouter();

  // Command history for navigation
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  // Last response for display
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);

  // Handle command submission
  const handleSubmit = useCallback(
    async (input: string) => {
      // Add to history
      setCommandHistory((prev) => [...prev, input]);

      // Process through chat handler
      try {
        const response = await chatHandler.processInput(input);
        setLastResponse(response);

        // Handle navigation actions
        if (response.actions) {
          for (const action of response.actions) {
            if (action.type === "navigate" && action.payload) {
              const payload = action.payload as { screen: string };
              router.navigate(payload.screen as any);
            }
          }
        }
      } catch (error) {
        setLastResponse({
          content: error instanceof Error ? error.message : "An error occurred",
          type: "error",
          success: false,
        });
      }
    },
    [chatHandler, router]
  );

  // Handle autocomplete
  const handleAutocomplete = useCallback(
    async (input: string): Promise<AutocompleteResult> => {
      return chatHandler.getAutocompleteSuggestions(input);
    },
    [chatHandler]
  );

  // Global keyboard shortcuts
  useKeyboard((key) => {
    // Ctrl+C to exit
    if (key.ctrl && key.name === "c") {
      onExit?.();
      process.exit(0);
    }

    // Escape to go back (will be handled by screens)
    // Tab to switch panels (will be handled by screens)
    // / to open command input (will be handled by screens)
    // ? to show help (will be handled by screens)
  });

  return (
    <box flexDirection="column" height="100%">
      {/* Header */}
      <Header
        sessionName={state.sessionName}
        featureName={state.featureName}
        debug={state.debug}
      />

      {/* Main content area */}
      <box flexGrow={1} flexDirection="column">
        <ScreenRouter />

        {/* Display last response if any */}
        {lastResponse && lastResponse.content && (
          <box paddingLeft={1} paddingRight={1} paddingTop={1}>
            <text>
              <span
                fg={
                  lastResponse.type === "error"
                    ? "red"
                    : lastResponse.type === "command"
                    ? "green"
                    : "white"
                }
              >
                {lastResponse.content}
              </span>
            </text>
          </box>
        )}
      </box>

      {/* Command Prompt */}
      <box paddingLeft={1} paddingRight={1}>
        <CommandPrompt
          prompt="> "
          placeholder="Type a command or message..."
          history={commandHistory}
          onSubmit={handleSubmit}
          onAutocomplete={handleAutocomplete}
          focused={true}
          enableAutocomplete={true}
        />
      </box>

      {/* Footer */}
      <Footer
        status={state.status}
        statusType={state.statusType}
        cost={state.cost}
      />
    </box>
  );
}

/**
 * App Component
 *
 * Root application component with router provider.
 *
 * @example
 * ```tsx
 * import { createCliRenderer } from "@opentui/core";
 * import { createRoot } from "@opentui/react";
 * import { App } from "./tui/app";
 *
 * const renderer = await createCliRenderer();
 * createRoot(renderer).render(
 *   <App
 *     state={{ sessionName: "my-project" }}
 *     initialParams={{ isInitialized: true, projectPath: "/my/project" }}
 *     onExit={() => console.log("Goodbye!")}
 *   />
 * );
 * ```
 */
export function App(props: AppProps) {
  return (
    <RouterProvider initialScreen="dashboard" initialParams={props.initialParams}>
      <AppContent {...props} />
    </RouterProvider>
  );
}

export default App;
