/**
 * Help List Component
 *
 * A simple list navigation component for the help system.
 * Shows content immediately when navigating with arrow keys.
 */

import { useState, useCallback, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import { BORDER_COLORS } from "../../theme/index.js";
import type { HelpTopic } from "./help-data.js";
import { HELP_TOPICS } from "./help-data.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for HelpTree component.
 */
export interface HelpTreeProps {
  /** Topics to display (defaults to HELP_TOPICS) */
  topics?: HelpTopic[];
  /** Currently selected topic ID */
  selectedId?: string;
  /** Callback when a topic is selected (called on navigation) */
  onSelect?: (topic: HelpTopic) => void;
  /** Whether this component is focused */
  focused?: boolean;
  /** Maximum height in lines */
  maxHeight?: number;
  /** Width of the list panel */
  width?: number;
}

// ============================================================================
// List Item Component
// ============================================================================

interface ListItemProps {
  topic: HelpTopic;
  isSelected: boolean;
  isFocused: boolean;
  width: number;
}

function ListItem({ topic, isSelected, isFocused, width }: ListItemProps) {
  // Determine colors
  const bgColor = isSelected && isFocused ? "cyan" : undefined;
  const fgColor = isSelected && isFocused ? "black" : isSelected ? "cyan" : "white";
  const descColor = isSelected && isFocused ? "black" : "gray";

  // Calculate available width for label and description
  const labelWidth = 14;
  const descWidth = width - labelWidth - 3;

  // Truncate description if needed
  const desc = topic.description || "";
  const truncatedDesc =
    desc.length > descWidth ? desc.substring(0, descWidth - 1) + "\u2026" : desc;

  return (
    <box height={1}>
      <text>
        {isSelected && isFocused ? (
          <span bg={bgColor} fg={fgColor}>
            {` ${topic.label.padEnd(labelWidth)}${truncatedDesc.padEnd(width - labelWidth - 1)}`}
          </span>
        ) : (
          <>
            <span fg={fgColor}> {topic.label.padEnd(labelWidth)}</span>
            <span fg={descColor}>{truncatedDesc}</span>
          </>
        )}
      </text>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * HelpTree Component (now a simple list)
 *
 * Renders a flat list of commands with immediate selection on navigation.
 */
export function HelpTree({
  topics = HELP_TOPICS,
  selectedId,
  onSelect,
  focused = true,
  maxHeight = 20,
  width = 35,
}: HelpTreeProps) {
  // Track selected index
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Track scroll offset
  const [scrollOffset, setScrollOffset] = useState(0);

  // Find index of selected ID if provided externally
  useEffect(() => {
    if (selectedId) {
      const idx = topics.findIndex((t) => t.id === selectedId);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
    }
  }, [selectedId, topics]);

  // Ensure selected index is visible
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + maxHeight) {
      setScrollOffset(selectedIndex - maxHeight + 1);
    }
  }, [selectedIndex, scrollOffset, maxHeight]);

  // Select topic and notify parent (called on navigation)
  const selectTopic = useCallback(
    (index: number) => {
      const topic = topics[index];
      if (topic && onSelect) {
        onSelect(topic);
      }
    },
    [topics, onSelect]
  );

  // Handle keyboard input
  useKeyboard(
    (key) => {
      if (!focused) return;

      if (key.name === "up" || (key.name === "k" && !key.ctrl)) {
        // Move up and select
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        selectTopic(newIndex);
      } else if (key.name === "down" || (key.name === "j" && !key.ctrl)) {
        // Move down and select
        const newIndex = Math.min(topics.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        selectTopic(newIndex);
      } else if (key.name === "home" || (key.name === "g" && !key.shift)) {
        // Go to first
        setSelectedIndex(0);
        setScrollOffset(0);
        selectTopic(0);
      } else if (key.name === "end" || (key.name === "g" && key.shift)) {
        // Go to last
        const lastIndex = topics.length - 1;
        setSelectedIndex(lastIndex);
        selectTopic(lastIndex);
      } else if (key.name === "pageup") {
        // Page up
        const newIndex = Math.max(0, selectedIndex - maxHeight);
        setSelectedIndex(newIndex);
        selectTopic(newIndex);
      } else if (key.name === "pagedown") {
        // Page down
        const newIndex = Math.min(topics.length - 1, selectedIndex + maxHeight);
        setSelectedIndex(newIndex);
        selectTopic(newIndex);
      }
    },
    [focused, topics, selectedIndex, selectTopic, maxHeight]
  );

  // Initial selection on mount
  useEffect(() => {
    if (topics.length > 0 && onSelect) {
      onSelect(topics[selectedIndex] || topics[0]!);
    }
  }, []); // Only on mount

  // Get visible items
  const visibleItems = topics.slice(scrollOffset, scrollOffset + maxHeight);

  // Calculate if we need scroll indicators
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + maxHeight < topics.length;

  return (
    <box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? BORDER_COLORS.focused : BORDER_COLORS.default}
    >
      {/* Header */}
      <box height={1} paddingLeft={1} borderBottom borderColor="gray">
        <text>
          <span fg="cyan" bold>
            Commands
          </span>
          <span fg="gray"> ({topics.length})</span>
        </text>
      </box>

      {/* Scroll up indicator */}
      {showScrollUp && (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg="gray">{"\u25B2"} more</span>
          </text>
        </box>
      )}

      {/* List items */}
      {visibleItems.map((topic, idx) => (
        <ListItem
          key={topic.id}
          topic={topic}
          isSelected={scrollOffset + idx === selectedIndex}
          isFocused={focused}
          width={width - 2}
        />
      ))}

      {/* Scroll down indicator */}
      {showScrollDown && (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg="gray">{"\u25BC"} more</span>
          </text>
        </box>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default HelpTree;
