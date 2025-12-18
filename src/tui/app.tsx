/**
 * TUI Application Shell
 *
 * Main application component that provides the layout structure
 * with header, content area, and footer.
 */

import { useKeyboard } from "@opentui/react";
import { Header } from "./components/header.js";
import { Footer } from "./components/footer.js";
import { ScreenRouter, RouterProvider } from "./router.js";

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
  /** Callback when exit is requested */
  onExit?: () => void;
}

/**
 * Main App Content
 *
 * Contains the actual layout with header, content, and footer.
 */
function AppContent({ state = {}, onExit }: AppProps) {
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
 *     onExit={() => console.log("Goodbye!")}
 *   />
 * );
 * ```
 */
export function App(props: AppProps) {
  return (
    <RouterProvider initialScreen="dashboard">
      <AppContent {...props} />
    </RouterProvider>
  );
}

export default App;
