/**
 * SplitPane Component
 *
 * A split layout component for arranging two panes side-by-side (horizontal)
 * or stacked (vertical) with configurable ratio and focus management.
 */

import { useState, useCallback, type ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import { BORDER_COLORS } from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Pane identifier type.
 */
export type PaneId = "first" | "second";

/**
 * Props for the SplitPane component.
 */
export interface SplitPaneProps {
  /** Split direction: horizontal (left/right) or vertical (top/bottom) */
  direction: "horizontal" | "vertical";
  /** Split ratio from 0 to 1 (default 0.5 for equal split) */
  ratio?: number;
  /** Content for the first pane (left or top) */
  first: ReactNode;
  /** Content for the second pane (right or bottom) */
  second: ReactNode;
  /** Optional title for the first pane */
  firstTitle?: string;
  /** Optional title for the second pane */
  secondTitle?: string;
  /** Currently focused pane (controlled mode) */
  focusedPane?: PaneId;
  /** Callback when focus changes between panes */
  onFocusChange?: (pane: PaneId) => void;
  /** Whether to show a divider between panes */
  showDivider?: boolean;
  /** Whether to handle keyboard navigation (Tab to switch) */
  handleKeyboard?: boolean;
  /** Minimum size for panes in characters/rows */
  minSize?: number;
  /** Width of the split pane container */
  width?: number | string;
  /** Height of the split pane container */
  height?: number | string;
  /** Flex grow value */
  flexGrow?: number;
  /** Whether the component is focused (enables keyboard handling) */
  focused?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate pane sizes based on ratio.
 */
function calculatePaneSizes(
  ratio: number,
  minSize: number,
  totalSize: number
): { first: number; second: number } {
  // Clamp ratio between 0.1 and 0.9 to prevent invisible panes
  const clampedRatio = Math.max(0.1, Math.min(0.9, ratio));

  let firstSize = Math.floor(totalSize * clampedRatio);
  let secondSize = totalSize - firstSize;

  // Ensure minimum sizes
  if (firstSize < minSize) {
    firstSize = minSize;
    secondSize = totalSize - firstSize;
  } else if (secondSize < minSize) {
    secondSize = minSize;
    firstSize = totalSize - secondSize;
  }

  return { first: firstSize, second: secondSize };
}

// ============================================================================
// Divider Sub-component
// ============================================================================

interface DividerProps {
  direction: "horizontal" | "vertical";
  focused: boolean;
}

/**
 * Visual divider between panes.
 */
function Divider({ direction, focused }: DividerProps) {
  const color = focused ? BORDER_COLORS.focused : BORDER_COLORS.muted;

  if (direction === "horizontal") {
    // Vertical line divider for horizontal split
    return (
      <box width={1} flexDirection="column" flexGrow={1}>
        <text>
          <span fg={color}>{"\u2502"}</span>
        </text>
      </box>
    );
  }

  // Horizontal line divider for vertical split
  return (
    <box height={1} flexGrow={1}>
      <text>
        <span fg={color}>{"\u2500".repeat(80)}</span>
      </text>
    </box>
  );
}

// ============================================================================
// Pane Wrapper Sub-component
// ============================================================================

interface PaneWrapperProps {
  children: ReactNode;
  title?: string;
  focused: boolean;
  direction: "horizontal" | "vertical";
  size: string;
}

/**
 * Wrapper for individual pane content with optional title.
 */
function PaneWrapper({
  children,
  title,
  focused,
  direction,
  size,
}: PaneWrapperProps) {
  const borderColor = focused ? BORDER_COLORS.focused : BORDER_COLORS.default;

  // Size prop for the pane
  const sizeProps =
    direction === "horizontal"
      ? { width: size }
      : { height: size };

  return (
    <box
      flexDirection="column"
      {...sizeProps}
      flexGrow={0}
      flexShrink={0}
    >
      {/* Optional title bar */}
      {title && (
        <box
          height={1}
          paddingLeft={1}
          paddingRight={1}
          borderBottom
          borderColor={borderColor}
        >
          <text>
            <span fg={focused ? "cyan" : "white"} bold={focused}>
              {title}
            </span>
          </text>
        </box>
      )}

      {/* Pane content */}
      <box flexDirection="column" flexGrow={1}>
        {children}
      </box>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SplitPane Component
 *
 * A flexible split layout component for arranging two panes with configurable
 * orientation, ratio, and keyboard-based focus switching.
 *
 * @example
 * ```tsx
 * // Horizontal split (side by side)
 * <SplitPane
 *   direction="horizontal"
 *   ratio={0.3}
 *   first={<AgentList />}
 *   second={<AgentOutput />}
 *   firstTitle="Agents"
 *   secondTitle="Output"
 * />
 *
 * // Vertical split (top/bottom)
 * <SplitPane
 *   direction="vertical"
 *   ratio={0.7}
 *   first={<MainContent />}
 *   second={<StatusBar />}
 * />
 *
 * // Controlled focus
 * const [focused, setFocused] = useState<PaneId>('first');
 * <SplitPane
 *   direction="horizontal"
 *   focusedPane={focused}
 *   onFocusChange={setFocused}
 *   first={<LeftPane />}
 *   second={<RightPane />}
 * />
 * ```
 */
export function SplitPane({
  direction,
  ratio = 0.5,
  first,
  second,
  firstTitle,
  secondTitle,
  focusedPane: controlledFocusedPane,
  onFocusChange,
  showDivider = true,
  handleKeyboard = true,
  minSize = 5,
  width,
  height,
  flexGrow,
  focused = true,
}: SplitPaneProps) {
  // Internal focus state for uncontrolled mode
  const [internalFocusedPane, setInternalFocusedPane] = useState<PaneId>("first");

  // Use controlled or internal focus state
  const focusedPane = controlledFocusedPane ?? internalFocusedPane;
  const setFocusedPane = onFocusChange ?? setInternalFocusedPane;

  // Toggle focus between panes
  const toggleFocus = useCallback(() => {
    const newPane = focusedPane === "first" ? "second" : "first";
    setFocusedPane(newPane);
  }, [focusedPane, setFocusedPane]);

  // Focus specific pane
  const focusFirst = useCallback(() => {
    if (focusedPane !== "first") {
      setFocusedPane("first");
    }
  }, [focusedPane, setFocusedPane]);

  const focusSecond = useCallback(() => {
    if (focusedPane !== "second") {
      setFocusedPane("second");
    }
  }, [focusedPane, setFocusedPane]);

  // Handle keyboard navigation
  useKeyboard((key) => {
    if (!focused || !handleKeyboard) return;

    // Tab to switch focus between panes
    if (key.name === "tab" && !key.shift) {
      toggleFocus();
      return;
    }

    // Shift+Tab to switch focus in reverse
    if (key.name === "tab" && key.shift) {
      toggleFocus();
      return;
    }

    // Arrow keys for navigation based on direction
    if (direction === "horizontal") {
      // Left arrow to focus first pane
      if (key.name === "left" && key.ctrl) {
        focusFirst();
        return;
      }
      // Right arrow to focus second pane
      if (key.name === "right" && key.ctrl) {
        focusSecond();
        return;
      }
    } else {
      // Up arrow to focus first pane
      if (key.name === "up" && key.ctrl) {
        focusFirst();
        return;
      }
      // Down arrow to focus second pane
      if (key.name === "down" && key.ctrl) {
        focusSecond();
        return;
      }
    }

    // Number keys: 1 for first pane, 2 for second pane
    if (key.sequence === "1" && key.ctrl) {
      focusFirst();
      return;
    }
    if (key.sequence === "2" && key.ctrl) {
      focusSecond();
      return;
    }
  });

  // Calculate size percentages
  const firstPercent = `${Math.round(ratio * 100)}%`;
  const secondPercent = `${Math.round((1 - ratio) * 100)}%`;

  // Render layout
  return (
    <box
      flexDirection={direction === "horizontal" ? "row" : "column"}
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      {/* First pane */}
      <PaneWrapper
        title={firstTitle}
        focused={focusedPane === "first"}
        direction={direction}
        size={firstPercent}
      >
        {first}
      </PaneWrapper>

      {/* Divider */}
      {showDivider && (
        <Divider direction={direction} focused={focused} />
      )}

      {/* Second pane */}
      <PaneWrapper
        title={secondTitle}
        focused={focusedPane === "second"}
        direction={direction}
        size={secondPercent}
      >
        {second}
      </PaneWrapper>
    </box>
  );
}

// ============================================================================
// Hook for SplitPane State
// ============================================================================

/**
 * Hook for managing SplitPane focus state.
 */
export function useSplitPaneFocus(initialPane: PaneId = "first") {
  const [focusedPane, setFocusedPane] = useState<PaneId>(initialPane);

  const focusFirst = useCallback(() => {
    setFocusedPane("first");
  }, []);

  const focusSecond = useCallback(() => {
    setFocusedPane("second");
  }, []);

  const toggle = useCallback(() => {
    setFocusedPane((current) => (current === "first" ? "second" : "first"));
  }, []);

  const isFirstFocused = focusedPane === "first";
  const isSecondFocused = focusedPane === "second";

  return {
    focusedPane,
    setFocusedPane,
    focusFirst,
    focusSecond,
    toggle,
    isFirstFocused,
    isSecondFocused,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default SplitPane;
