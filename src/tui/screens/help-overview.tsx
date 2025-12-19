/**
 * Help Overview Screen
 *
 * Full-screen modal overlay for the help system.
 * Provides a two-panel layout with tree navigation and content display.
 */

import { useState, useCallback, useEffect } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { registerScreen, useRouter } from "../router.js";
import { HelpTree, HelpContent, HELP_TOPICS } from "../components/help/index.js";
import type { HelpTopic } from "../components/help/index.js";
import { BORDER_COLORS } from "../theme/index.js";

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
}: {
  isTreeFocused: boolean;
}) {
  return (
    <box
      height={FOOTER_HEIGHT}
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
    >
      <text>
        <span fg="gray">
          {"\u2191\u2193"}/jk: Navigate | Tab: Switch panel | q/Esc: Close
        </span>
      </text>
      <text>
        <span fg={isTreeFocused ? "cyan" : "gray"}>
          {isTreeFocused ? "[Commands]" : "Commands"}
        </span>
        <span fg="gray"> | </span>
        <span fg={!isTreeFocused ? "cyan" : "gray"}>
          {!isTreeFocused ? "[Details]" : "Details"}
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

  // Handle topic selection (called immediately on navigation)
  const handleSelectTopic = useCallback((topic: HelpTopic) => {
    setSelectedTopic(topic);
    setSelectedId(topic.id);

    // Simple breadcrumb for flat list
    setBreadcrumb(["Help", topic.label]);
  }, []);

  // Handle close/back navigation
  const handleClose = useCallback(() => {
    router.goBack();
  }, [router]);

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

      // Escape or Q to close help
      if (key.name === "escape" || (key.name === "q" && !key.ctrl)) {
        handleClose();
        return;
      }
    },
    [toggleFocus, handleClose]
  );

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
          />
        </box>
      </box>

      {/* Footer */}
      <HelpFooter isTreeFocused={isTreeFocused} />
    </box>
  );
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
