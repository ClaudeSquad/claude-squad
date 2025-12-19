/**
 * Help State Management
 *
 * State management for the help system, including navigation state,
 * current screen tracking, and breadcrumb management.
 */

import { useState, useCallback, useMemo } from "react";

// ============================================================================
// Types
// ============================================================================

/**
 * Help screen identifiers for navigation.
 */
export enum HelpScreen {
  /** Overview/landing page */
  OVERVIEW = "overview",
  /** Commands reference */
  COMMANDS = "commands",
  /** Agents concept */
  CONCEPT_AGENTS = "concept-agents",
  /** Skills concept */
  CONCEPT_SKILLS = "concept-skills",
  /** Stages concept */
  CONCEPT_STAGES = "concept-stages",
  /** Review gates concept */
  CONCEPT_GATES = "concept-gates",
  /** Git worktrees concept */
  CONCEPT_WORKTREES = "concept-worktrees",
  /** Keyboard shortcuts */
  SHORTCUTS = "shortcuts",
  /** Getting started guide */
  GETTING_STARTED = "getting-started",
  /** Quick start tutorial */
  QUICK_START = "quick-start",
  /** First feature walkthrough */
  FIRST_FEATURE = "first-feature",
  /** Understanding workflows guide */
  UNDERSTANDING_WORKFLOWS = "understanding-workflows",
}

/**
 * Help state interface for tracking navigation and display.
 */
export interface HelpState {
  /** Whether the help panel is open */
  isOpen: boolean;
  /** Current help screen being displayed */
  currentScreen: HelpScreen;
  /** Currently selected topic ID (if any) */
  selectedTopic: string | null;
  /** Breadcrumb trail for navigation */
  breadcrumb: string[];
  /** Current scroll position in content area */
  scrollPosition: number;
  /** Currently selected index in tree navigation */
  selectedIndex: number;
  /** Whether tree panel is focused (vs content panel) */
  isTreeFocused: boolean;
}

/**
 * Default initial help state.
 */
export const DEFAULT_HELP_STATE: HelpState = {
  isOpen: false,
  currentScreen: HelpScreen.OVERVIEW,
  selectedTopic: null,
  breadcrumb: ["Help"],
  scrollPosition: 0,
  selectedIndex: 0,
  isTreeFocused: true,
};

// ============================================================================
// Help State Hook
// ============================================================================

/**
 * Hook for managing help system state.
 *
 * @param initialState - Optional initial state override
 * @returns Help state and action handlers
 *
 * @example
 * ```tsx
 * function HelpScreen() {
 *   const {
 *     state,
 *     openHelp,
 *     closeHelp,
 *     navigateTo,
 *     goBack,
 *   } = useHelpState();
 *
 *   return state.isOpen ? <HelpPanel state={state} /> : null;
 * }
 * ```
 */
export function useHelpState(initialState: Partial<HelpState> = {}) {
  const [state, setState] = useState<HelpState>({
    ...DEFAULT_HELP_STATE,
    ...initialState,
  });

  /**
   * Open the help panel.
   */
  const openHelp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
    }));
  }, []);

  /**
   * Close the help panel.
   */
  const closeHelp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  /**
   * Toggle the help panel.
   */
  const toggleHelp = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  }, []);

  /**
   * Navigate to a specific help screen.
   */
  const navigateTo = useCallback(
    (screen: HelpScreen, topicId: string | null = null, label: string = "") => {
      setState((prev) => ({
        ...prev,
        currentScreen: screen,
        selectedTopic: topicId,
        breadcrumb: [...prev.breadcrumb, label || screen],
        scrollPosition: 0,
      }));
    },
    []
  );

  /**
   * Go back to the previous screen in breadcrumb.
   */
  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.breadcrumb.length <= 1) {
        return prev;
      }

      const newBreadcrumb = prev.breadcrumb.slice(0, -1);

      return {
        ...prev,
        breadcrumb: newBreadcrumb,
        currentScreen: HelpScreen.OVERVIEW,
        selectedTopic: null,
        scrollPosition: 0,
      };
    });
  }, []);

  /**
   * Reset to initial/overview state.
   */
  const resetToOverview = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentScreen: HelpScreen.OVERVIEW,
      selectedTopic: null,
      breadcrumb: ["Help"],
      scrollPosition: 0,
      selectedIndex: 0,
    }));
  }, []);

  /**
   * Update scroll position.
   */
  const setScrollPosition = useCallback((position: number) => {
    setState((prev) => ({
      ...prev,
      scrollPosition: Math.max(0, position),
    }));
  }, []);

  /**
   * Update selected tree index.
   */
  const setSelectedIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(0, index),
    }));
  }, []);

  /**
   * Toggle focus between tree and content panels.
   */
  const toggleFocus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isTreeFocused: !prev.isTreeFocused,
    }));
  }, []);

  /**
   * Set tree focus state.
   */
  const setTreeFocused = useCallback((focused: boolean) => {
    setState((prev) => ({
      ...prev,
      isTreeFocused: focused,
    }));
  }, []);

  /**
   * Check if we can go back.
   */
  const canGoBack = useMemo(
    () => state.breadcrumb.length > 1,
    [state.breadcrumb.length]
  );

  return {
    state,
    openHelp,
    closeHelp,
    toggleHelp,
    navigateTo,
    goBack,
    resetToOverview,
    setScrollPosition,
    setSelectedIndex,
    toggleFocus,
    setTreeFocused,
    canGoBack,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a human-readable label for a help screen.
 */
export function getScreenLabel(screen: HelpScreen): string {
  const labels: Record<HelpScreen, string> = {
    [HelpScreen.OVERVIEW]: "Help Overview",
    [HelpScreen.COMMANDS]: "Commands Reference",
    [HelpScreen.CONCEPT_AGENTS]: "Agents & Roles",
    [HelpScreen.CONCEPT_SKILLS]: "Skills",
    [HelpScreen.CONCEPT_STAGES]: "Workflow Stages",
    [HelpScreen.CONCEPT_GATES]: "Review Gates",
    [HelpScreen.CONCEPT_WORKTREES]: "Git Worktrees",
    [HelpScreen.SHORTCUTS]: "Keyboard Shortcuts",
    [HelpScreen.GETTING_STARTED]: "Getting Started",
    [HelpScreen.QUICK_START]: "Quick Start Guide",
    [HelpScreen.FIRST_FEATURE]: "Your First Feature",
    [HelpScreen.UNDERSTANDING_WORKFLOWS]: "Understanding Workflows",
  };
  return labels[screen] || screen;
}

/**
 * Get screen from topic ID.
 */
export function getScreenFromTopicId(topicId: string): HelpScreen | null {
  const mapping: Record<string, HelpScreen> = {
    overview: HelpScreen.OVERVIEW,
    commands: HelpScreen.COMMANDS,
    "concept-agents": HelpScreen.CONCEPT_AGENTS,
    "concept-skills": HelpScreen.CONCEPT_SKILLS,
    "concept-stages": HelpScreen.CONCEPT_STAGES,
    "concept-gates": HelpScreen.CONCEPT_GATES,
    "concept-worktrees": HelpScreen.CONCEPT_WORKTREES,
    shortcuts: HelpScreen.SHORTCUTS,
    "getting-started": HelpScreen.GETTING_STARTED,
    "quick-start": HelpScreen.QUICK_START,
    "first-feature": HelpScreen.FIRST_FEATURE,
    "understanding-workflows": HelpScreen.UNDERSTANDING_WORKFLOWS,
  };
  return mapping[topicId] || null;
}

// ============================================================================
// Exports
// ============================================================================

export type HelpStateActions = ReturnType<typeof useHelpState>;

export default useHelpState;
