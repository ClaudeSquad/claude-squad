/**
 * Help Overview Screen
 *
 * Full-screen modal overlay for the help system.
 * Provides a two-panel layout with tree navigation and content display.
 */

import { useState, useCallback, useEffect } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { registerScreen, useRouter } from "../router.js";
import { HelpTree, HelpContent, HELP_TOPICS, findTopicById } from "../components/help/index.js";
import type { HelpTopic } from "../components/help/index.js";
import { BORDER_COLORS, TEXT_COLORS, PRIMARY_COLORS } from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for HelpOverviewScreen.
 */
export interface HelpOverviewScreenProps {
  /** Router params */
  params?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_TREE_WIDTH = 28;
const MAX_TREE_WIDTH = 40;
const MIN_CONTENT_WIDTH = 40;
const HEADER_HEIGHT = 3;
const FOOTER_HEIGHT = 2;

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Help screen header with title and breadcrumb.
 */
function HelpHeader({
  breadcrumb,
  width,
}: {
  breadcrumb: string[];
  width: number;
}) {
  const breadcrumbText = breadcrumb.join(" > ");
  const maxBreadcrumbLen = width - 20;
  const displayBreadcrumb =
    breadcrumbText.length > maxBreadcrumbLen
      ? "..." + breadcrumbText.slice(-maxBreadcrumbLen + 3)
      : breadcrumbText;

  return (
    <box
      height={HEADER_HEIGHT}
      borderStyle="single"
      borderColor={BORDER_COLORS.focused}
      flexDirection="column"
      paddingLeft={1}
      paddingRight={1}
    >
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <span fg="cyan" bold>
            {"\u2753"} Help System
          </span>
        </text>
        <text>
          <span fg="gray">{displayBreadcrumb}</span>
        </text>
      </box>
    </box>
  );
}

/**
 * Help screen footer with keyboard shortcuts.
 */
function HelpFooter({
  isTreeFocused,
  canGoBack,
}: {
  isTreeFocused: boolean;
  canGoBack: boolean;
}) {
  return (
    <box
      height={FOOTER_HEIGHT}
      borderTop
      borderColor="gray"
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
    >
      <text>
        <span fg="gray">
          Tab: Switch panel | {"\u2191\u2193"}: Navigate | Enter: Select |{" "}
          {canGoBack ? "Esc: Back | " : ""}q: Close
        </span>
      </text>
      <text>
        <span fg={isTreeFocused ? "cyan" : "gray"}>
          {isTreeFocused ? "[Tree]" : "Tree"}
        </span>
        <span fg="gray"> | </span>
        <span fg={!isTreeFocused ? "cyan" : "gray"}>
          {!isTreeFocused ? "[Content]" : "Content"}
        </span>
      </text>
    </box>
  );
}

/**
 * Search bar component (optional).
 */
function SearchBar({
  query,
  onQueryChange,
  focused,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  focused: boolean;
}) {
  return (
    <box
      height={1}
      borderBottom
      borderColor="gray"
      paddingLeft={1}
      paddingRight={1}
    >
      <text>
        <span fg={focused ? "cyan" : "gray"}>{"\u2315"} </span>
        <span fg={query ? "white" : "gray"}>
          {query || "Type to search..."}
        </span>
      </text>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * HelpOverviewScreen Component
 *
 * Full-screen help modal with tree navigation and content display.
 * Uses a two-panel layout with keyboard navigation.
 *
 * @example
 * ```tsx
 * // Registered with router and accessed via navigate("help")
 * router.navigate("help");
 * ```
 */
export function HelpOverviewScreen({ params }: HelpOverviewScreenProps) {
  const router = useRouter();
  const dimensions = useTerminalDimensions();

  // Get terminal dimensions
  const terminalWidth = dimensions.width || 80;
  const terminalHeight = dimensions.height || 24;

  // Focus state: true = tree focused, false = content focused
  const [isTreeFocused, setIsTreeFocused] = useState(true);

  // Selected topic
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Breadcrumb trail
  const [breadcrumb, setBreadcrumb] = useState<string[]>(["Help"]);

  // Calculate panel widths
  const contentAreaWidth = terminalWidth - 4; // Account for borders
  const treeWidth = Math.max(
    MIN_TREE_WIDTH,
    Math.min(MAX_TREE_WIDTH, Math.floor(contentAreaWidth * 0.35))
  );
  const contentWidth = Math.max(MIN_CONTENT_WIDTH, contentAreaWidth - treeWidth);

  // Calculate panel heights
  const availableHeight = terminalHeight - HEADER_HEIGHT - FOOTER_HEIGHT - 2;
  const panelHeight = Math.max(10, availableHeight);

  // Handle topic selection
  const handleSelectTopic = useCallback((topic: HelpTopic) => {
    setSelectedTopic(topic);
    setSelectedId(topic.id);

    // Build breadcrumb
    const path = getTopicPath(HELP_TOPICS, topic.id);
    if (path) {
      setBreadcrumb(["Help", ...path]);
    } else {
      setBreadcrumb(["Help", topic.label]);
    }

    // Switch focus to content if topic has content
    if (topic.content || topic.description) {
      setIsTreeFocused(false);
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (breadcrumb.length > 1) {
      setBreadcrumb((prev) => prev.slice(0, -1));
      setSelectedTopic(null);
      setSelectedId(null);
      setIsTreeFocused(true);
    } else {
      router.goBack();
    }
  }, [breadcrumb.length, router]);

  // Toggle focus between panels
  const toggleFocus = useCallback(() => {
    setIsTreeFocused((prev) => !prev);
  }, []);

  // Global keyboard handling
  useKeyboard(
    (key) => {
      // Tab to switch panels
      if (key.name === "tab") {
        toggleFocus();
        return;
      }

      // Escape to go back or close
      if (key.name === "escape") {
        if (breadcrumb.length > 1) {
          handleBack();
        } else {
          router.goBack();
        }
        return;
      }

      // Q to close help
      if (key.name === "q" && !key.ctrl) {
        router.goBack();
        return;
      }

      // ? to show shortcuts (could navigate to shortcuts topic)
      if (key.name === "?" || (key.shift && key.name === "/")) {
        const shortcutsTopic = findTopicById(HELP_TOPICS, "shortcuts");
        if (shortcutsTopic) {
          handleSelectTopic(shortcutsTopic);
        }
        return;
      }
    },
    [toggleFocus, handleBack, router, handleSelectTopic]
  );

  // Check if we can go back
  const canGoBack = breadcrumb.length > 1;

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <HelpHeader breadcrumb={breadcrumb} width={terminalWidth} />

      {/* Main content area */}
      <box flexDirection="row" flexGrow={1}>
        {/* Tree panel */}
        <box width={treeWidth}>
          <HelpTree
            topics={HELP_TOPICS}
            selectedId={selectedId || undefined}
            onSelect={handleSelectTopic}
            focused={isTreeFocused}
            maxHeight={panelHeight}
            width={treeWidth}
          />
        </box>

        {/* Content panel - directly adjacent to tree (both have borders) */}
        <box flexGrow={1}>
          <HelpContent
            topic={selectedTopic}
            focused={!isTreeFocused}
            maxHeight={panelHeight}
            width={contentWidth}
            onBack={handleBack}
          />
        </box>
      </box>

      {/* Footer */}
      <HelpFooter isTreeFocused={isTreeFocused} canGoBack={canGoBack} />
    </box>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the path (labels) to a topic for breadcrumb.
 */
function getTopicPath(
  topics: HelpTopic[],
  id: string,
  path: string[] = []
): string[] | null {
  for (const topic of topics) {
    if (topic.id === id) {
      return [...path, topic.label];
    }
    if (topic.children) {
      const found = getTopicPath(topic.children, id, [...path, topic.label]);
      if (found) return found;
    }
  }
  return null;
}

// ============================================================================
// Screen Registration
// ============================================================================

/**
 * Default export for the help overview screen.
 */
export default HelpOverviewScreen;

/**
 * Register the help overview screen with the router.
 */
export function registerHelpOverviewScreen(): void {
  registerScreen("help", {
    component: HelpOverviewScreen as any,
    title: "Help",
  });
}
