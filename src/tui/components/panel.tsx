/**
 * Panel Component
 *
 * A bordered container component with optional title, focus state,
 * padding options, and scrollable content support.
 */

import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  BORDER_COLORS,
  BOX_DRAWING,
  type BoxDrawingStyle,
  type TerminalColor,
} from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Padding configuration for the Panel.
 */
export interface PanelPadding {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/**
 * Props for the Panel component.
 */
export interface PanelProps {
  /** Optional title displayed in the top border */
  title?: string;
  /** Whether the panel is currently focused */
  focused?: boolean;
  /** Border style */
  border?: "single" | "double" | "rounded" | "bold" | "none";
  /** Padding inside the panel (number applies to all sides) */
  padding?: number | PanelPadding;
  /** Whether content should be scrollable */
  scrollable?: boolean;
  /** Maximum height for the panel (required for scrolling) */
  maxHeight?: number;
  /** Width of the panel */
  width?: number | string;
  /** Height of the panel */
  height?: number | string;
  /** Children to render inside the panel */
  children: ReactNode;
  /** Custom border color override */
  borderColor?: TerminalColor;
  /** Custom focused border color override */
  focusedBorderColor?: TerminalColor;
  /** Flex grow value */
  flexGrow?: number;
  /** Optional scroll offset for controlled scrolling */
  scrollOffset?: number;
  /** Callback when scroll position changes */
  onScroll?: (offset: number) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve padding configuration to explicit values.
 */
function resolvePadding(padding?: number | PanelPadding): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  if (padding === undefined) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  if (typeof padding === "number") {
    return { top: padding, bottom: padding, left: padding, right: padding };
  }

  return {
    top: padding.top ?? 0,
    bottom: padding.bottom ?? 0,
    left: padding.left ?? 0,
    right: padding.right ?? 0,
  };
}

/**
 * Get border style string for OpenTUI.
 */
function getBorderStyle(
  border?: "single" | "double" | "rounded" | "bold" | "none"
): "single" | "double" | "round" | "bold" | undefined {
  if (border === "none") return undefined;
  if (border === "rounded") return "round";
  return border ?? "single";
}

/**
 * Get border color based on focus state.
 */
function getBorderColor(
  focused: boolean,
  customBorderColor?: TerminalColor,
  customFocusedBorderColor?: TerminalColor
): TerminalColor {
  if (focused) {
    return customFocusedBorderColor ?? BORDER_COLORS.focused;
  }
  return customBorderColor ?? BORDER_COLORS.default;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Panel Component
 *
 * A bordered container with optional title, focus state, and scrollable content.
 * Uses box-drawing characters from the theme for consistent styling.
 *
 * @example
 * ```tsx
 * // Basic panel with title
 * <Panel title="My Panel" padding={1}>
 *   <text>Content here</text>
 * </Panel>
 *
 * // Focused panel with double border
 * <Panel title="Focused Panel" focused border="double" padding={1}>
 *   <text>Highlighted content</text>
 * </Panel>
 *
 * // Scrollable panel with max height
 * <Panel title="Logs" scrollable maxHeight={10} padding={1}>
 *   {logs.map((log, i) => <text key={i}>{log}</text>)}
 * </Panel>
 * ```
 */
export function Panel({
  title,
  focused = false,
  border = "single",
  padding,
  scrollable = false,
  maxHeight,
  width,
  height,
  children,
  borderColor: customBorderColor,
  focusedBorderColor: customFocusedBorderColor,
  flexGrow,
  scrollOffset: controlledScrollOffset,
  onScroll,
}: PanelProps) {
  // Resolve padding
  const resolvedPadding = resolvePadding(padding);

  // Get border style and color
  const borderStyle = getBorderStyle(border);
  const borderColor = getBorderColor(
    focused,
    customBorderColor,
    customFocusedBorderColor
  );

  // Scroll state (internal or controlled)
  const [internalScrollOffset, setInternalScrollOffset] = useState(0);
  const scrollOffset = controlledScrollOffset ?? internalScrollOffset;
  const setScrollOffset = onScroll ?? setInternalScrollOffset;

  // Content height tracking for scroll calculations
  const [contentHeight, setContentHeight] = useState(0);

  // Calculate visible height for scrolling
  const visibleHeight = maxHeight
    ? maxHeight - (borderStyle ? 2 : 0) - resolvedPadding.top - resolvedPadding.bottom
    : undefined;

  // Render panel without border
  if (border === "none") {
    return (
      <box
        flexDirection="column"
        width={width}
        height={height}
        flexGrow={flexGrow}
        paddingTop={resolvedPadding.top}
        paddingBottom={resolvedPadding.bottom}
        paddingLeft={resolvedPadding.left}
        paddingRight={resolvedPadding.right}
      >
        {children}
      </box>
    );
  }

  // Render panel with border
  return (
    <box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
      borderStyle={borderStyle}
      borderColor={borderColor}
    >
      {/* Title row (if title provided) */}
      {title && (
        <box
          flexDirection="row"
          position="absolute"
          top={-1}
          left={1}
        >
          <text>
            <span fg={focused ? "cyan" : "white"}>{` ${title} `}</span>
          </text>
        </box>
      )}

      {/* Content area */}
      <box
        flexDirection="column"
        flexGrow={1}
        paddingTop={resolvedPadding.top}
        paddingBottom={resolvedPadding.bottom}
        paddingLeft={resolvedPadding.left}
        paddingRight={resolvedPadding.right}
        overflow={scrollable ? "hidden" : undefined}
        maxHeight={visibleHeight}
      >
        {scrollable && visibleHeight ? (
          <ScrollableContent
            offset={scrollOffset}
            visibleHeight={visibleHeight}
            onContentHeightChange={setContentHeight}
          >
            {children}
          </ScrollableContent>
        ) : (
          children
        )}
      </box>

      {/* Scroll indicator (if scrollable and content exceeds visible area) */}
      {scrollable && contentHeight > (visibleHeight ?? 0) && (
        <ScrollIndicator
          scrollOffset={scrollOffset}
          contentHeight={contentHeight}
          visibleHeight={visibleHeight ?? 0}
          focused={focused}
        />
      )}
    </box>
  );
}

// ============================================================================
// Scrollable Content Sub-component
// ============================================================================

interface ScrollableContentProps {
  children: ReactNode;
  offset: number;
  visibleHeight: number;
  onContentHeightChange: (height: number) => void;
}

/**
 * Internal component for handling scrollable content.
 */
function ScrollableContent({
  children,
  offset,
  visibleHeight,
  onContentHeightChange,
}: ScrollableContentProps) {
  // We use a wrapper box with overflow hidden and margin-top to simulate scrolling
  // Note: In a real implementation, this would integrate with OpenTUI's scrollbox
  return (
    <box
      flexDirection="column"
      marginTop={-offset}
      overflow="hidden"
    >
      {children}
    </box>
  );
}

// ============================================================================
// Scroll Indicator Sub-component
// ============================================================================

interface ScrollIndicatorProps {
  scrollOffset: number;
  contentHeight: number;
  visibleHeight: number;
  focused: boolean;
}

/**
 * Visual indicator showing scroll position.
 */
function ScrollIndicator({
  scrollOffset,
  contentHeight,
  visibleHeight,
  focused,
}: ScrollIndicatorProps) {
  // Calculate scroll bar position and size
  const scrollRatio = visibleHeight / contentHeight;
  const thumbSize = Math.max(1, Math.floor(visibleHeight * scrollRatio));
  const maxScroll = contentHeight - visibleHeight;
  const thumbPosition = maxScroll > 0
    ? Math.floor((scrollOffset / maxScroll) * (visibleHeight - thumbSize))
    : 0;

  // Build scroll track
  const track: string[] = [];
  for (let i = 0; i < visibleHeight; i++) {
    if (i >= thumbPosition && i < thumbPosition + thumbSize) {
      track.push("\u2588"); // Full block for thumb
    } else {
      track.push("\u2591"); // Light shade for track
    }
  }

  return (
    <box
      position="absolute"
      right={0}
      top={0}
      height={visibleHeight}
      width={1}
      flexDirection="column"
    >
      {track.map((char, i) => (
        <text key={i}>
          <span fg={focused ? "cyan" : "gray"}>{char}</span>
        </text>
      ))}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Panel;
