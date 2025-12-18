/**
 * Screen Router
 *
 * Manages navigation between different TUI screens.
 */

import { createContext, useContext, useState, useCallback, type ReactNode, type ComponentType, createElement } from "react";

/**
 * Available screens in the application
 */
export type ScreenName =
  | "dashboard"   // Main dashboard with agents and status
  | "chat"        // Chat/REPL interface
  | "agents"      // Agent management
  | "workflows"   // Workflow management
  | "skills"      // Skills management
  | "sessions"    // Session list
  | "settings"    // Settings
  | "help";       // Help screen

/**
 * Screen parameters
 */
export interface ScreenParams {
  [key: string]: unknown;
}

/**
 * Navigation state
 */
interface NavigationState {
  /** Current screen */
  screen: ScreenName;
  /** Screen parameters */
  params: ScreenParams;
  /** Navigation history */
  history: Array<{ screen: ScreenName; params: ScreenParams }>;
}

/**
 * Router context value
 */
interface RouterContextValue {
  /** Current screen */
  currentScreen: ScreenName;
  /** Current screen parameters */
  params: ScreenParams;
  /** Navigate to a screen */
  navigate: (screen: ScreenName, params?: ScreenParams) => void;
  /** Go back to previous screen */
  goBack: () => void;
  /** Check if can go back */
  canGoBack: boolean;
  /** Replace current screen (no history) */
  replace: (screen: ScreenName, params?: ScreenParams) => void;
}

/**
 * Router context
 */
const RouterContext = createContext<RouterContextValue | null>(null);

/**
 * Router provider props
 */
interface RouterProviderProps {
  /** Initial screen */
  initialScreen?: ScreenName;
  /** Initial params */
  initialParams?: ScreenParams;
  /** Children */
  children: ReactNode;
}

/**
 * Router Provider
 *
 * Provides navigation context to the application.
 *
 * @example
 * ```tsx
 * <RouterProvider initialScreen="dashboard">
 *   <App />
 * </RouterProvider>
 * ```
 */
export function RouterProvider({
  initialScreen = "dashboard",
  initialParams = {},
  children,
}: RouterProviderProps) {
  const [state, setState] = useState<NavigationState>({
    screen: initialScreen,
    params: initialParams,
    history: [],
  });

  const navigate = useCallback((screen: ScreenName, params: ScreenParams = {}) => {
    setState((prev) => ({
      screen,
      params,
      history: [...prev.history, { screen: prev.screen, params: prev.params }],
    }));
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.history.length === 0) return prev;

      const history = [...prev.history];
      const last = history.pop()!;

      return {
        screen: last.screen,
        params: last.params,
        history,
      };
    });
  }, []);

  const replace = useCallback((screen: ScreenName, params: ScreenParams = {}) => {
    setState((prev) => ({
      ...prev,
      screen,
      params,
    }));
  }, []);

  const value: RouterContextValue = {
    currentScreen: state.screen,
    params: state.params,
    navigate,
    goBack,
    canGoBack: state.history.length > 0,
    replace,
  };

  return (
    <RouterContext.Provider value={value}>
      {children}
    </RouterContext.Provider>
  );
}

/**
 * Hook to access router context
 *
 * @returns Router context value
 * @throws If used outside RouterProvider
 */
export function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
}

/**
 * Screen component props
 */
interface ScreenComponentProps {
  params: ScreenParams;
}

/**
 * Screen registry entry
 */
interface ScreenEntry {
  /** Screen component */
  component: ComponentType<ScreenComponentProps>;
  /** Screen title (for header) */
  title?: string;
}

/**
 * Screen registry
 */
const screenRegistry = new Map<ScreenName, ScreenEntry>();

/**
 * Register a screen component
 *
 * @param name - Screen name
 * @param entry - Screen entry
 */
export function registerScreen(name: ScreenName, entry: ScreenEntry): void {
  screenRegistry.set(name, entry);
}

/**
 * Get a registered screen
 *
 * @param name - Screen name
 * @returns Screen entry or undefined
 */
export function getScreen(name: ScreenName): ScreenEntry | undefined {
  return screenRegistry.get(name);
}

/**
 * Placeholder screen component
 */
function PlaceholderScreen({ screenName }: { screenName: ScreenName }) {
  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
    >
      <text>
        <span fg="yellow">Screen not implemented:</span>{" "}
        <span fg="cyan">{screenName}</span>
      </text>
      <text>
        <span fg="gray">
          Register this screen using registerScreen()
        </span>
      </text>
    </box>
  );
}

/**
 * Screen Router Component
 *
 * Renders the current screen based on navigation state.
 */
export function ScreenRouter() {
  const { currentScreen, params } = useRouter();

  const screenEntry = getScreen(currentScreen);

  if (!screenEntry) {
    return <PlaceholderScreen screenName={currentScreen} />;
  }

  // Use createElement to avoid JSX component type issues
  return createElement(screenEntry.component, { params });
}

export default ScreenRouter;
