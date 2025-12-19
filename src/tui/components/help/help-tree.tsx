/**
 * Help Tree Component
 *
 * A hierarchical tree navigation component for the help system.
 * Supports keyboard navigation, expand/collapse, and visual selection.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import { BORDER_COLORS, PRIMARY_COLORS, TEXT_COLORS } from "../../theme/index.js";
import type { HelpTopic } from "./help-data.js";
import { HELP_TOPICS } from "./help-data.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Flattened tree node for rendering.
 */
interface FlattenedNode {
  /** Original topic */
  topic: HelpTopic;
  /** Indentation depth */
  depth: number;
  /** Whether this node has children */
  hasChildren: boolean;
  /** Whether this node is expanded */
  isExpanded: boolean;
  /** Index in the flattened list */
  index: number;
}

/**
 * Props for HelpTree component.
 */
export interface HelpTreeProps {
  /** Topics to display (defaults to HELP_TOPICS) */
  topics?: HelpTopic[];
  /** Currently selected topic ID */
  selectedId?: string;
  /** Callback when a topic is selected */
  onSelect?: (topic: HelpTopic) => void;
  /** Whether this component is focused */
  focused?: boolean;
  /** Maximum height in lines */
  maxHeight?: number;
  /** Width of the tree panel */
  width?: number;
}

// ============================================================================
// Constants
// ============================================================================

const TREE_ICONS = {
  expanded: "\u25BC", // Down arrow
  collapsed: "\u25B6", // Right arrow
  leaf: "\u2022", // Bullet
  branch: "\u251C\u2500", // Branch
  lastBranch: "\u2514\u2500", // Last branch
  vertical: "\u2502 ", // Vertical line
  space: "  ", // Space
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Flatten the tree for rendering, respecting expanded state.
 */
function flattenTree(
  topics: HelpTopic[],
  expandedSet: Set<string>,
  depth: number = 0,
  result: FlattenedNode[] = []
): FlattenedNode[] {
  for (const topic of topics) {
    const hasChildren = Boolean(topic.children && topic.children.length > 0);
    const isExpanded = expandedSet.has(topic.id);

    result.push({
      topic,
      depth,
      hasChildren,
      isExpanded,
      index: result.length,
    });

    if (hasChildren && isExpanded && topic.children) {
      flattenTree(topic.children, expandedSet, depth + 1, result);
    }
  }

  return result;
}

/**
 * Get initial expanded set from topics with defaultExpanded.
 */
function getInitialExpanded(topics: HelpTopic[]): Set<string> {
  const expanded = new Set<string>();

  function traverse(items: HelpTopic[]) {
    for (const item of items) {
      if (item.defaultExpanded) {
        expanded.add(item.id);
      }
      if (item.children) {
        traverse(item.children);
      }
    }
  }

  traverse(topics);
  return expanded;
}

// ============================================================================
// Tree Node Component
// ============================================================================

interface TreeNodeProps {
  node: FlattenedNode;
  isSelected: boolean;
  isFocused: boolean;
  width: number;
  onToggle: () => void;
  onSelect: () => void;
}

function TreeNode({
  node,
  isSelected,
  isFocused,
  width,
  onToggle,
  onSelect,
}: TreeNodeProps) {
  const { topic, depth, hasChildren, isExpanded } = node;

  // Build indentation
  const indent = "  ".repeat(depth);

  // Build prefix icon
  let prefixIcon: string;
  if (hasChildren) {
    prefixIcon = isExpanded ? TREE_ICONS.expanded : TREE_ICONS.collapsed;
  } else {
    prefixIcon = topic.icon || TREE_ICONS.leaf;
  }

  // Build the full label
  const prefix = `${indent}${prefixIcon} `;
  const labelText = topic.label;
  const maxLabelWidth = width - prefix.length - 2;
  const truncatedLabel =
    labelText.length > maxLabelWidth
      ? labelText.substring(0, maxLabelWidth - 1) + "\u2026"
      : labelText;

  // Determine colors
  const bgColor = isSelected && isFocused ? "cyan" : undefined;
  const fgColor = isSelected && isFocused ? "black" : isSelected ? "cyan" : "white";
  const prefixColor = hasChildren ? "yellow" : topic.icon ? "gray" : "gray";

  return (
    <box height={1}>
      <text>
        {isSelected && isFocused ? (
          <span bg={bgColor} fg={fgColor}>
            {prefix}
            {truncatedLabel.padEnd(width - prefix.length)}
          </span>
        ) : (
          <>
            <span fg={prefixColor}>{prefix}</span>
            <span fg={fgColor} bold={isSelected}>
              {truncatedLabel}
            </span>
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
 * HelpTree Component
 *
 * Renders a hierarchical tree navigation for help topics.
 * Supports keyboard navigation with arrow keys, Enter to select/toggle,
 * and Space to expand/collapse.
 *
 * @example
 * ```tsx
 * <HelpTree
 *   topics={HELP_TOPICS}
 *   selectedId="quick-start"
 *   onSelect={(topic) => console.log("Selected:", topic.id)}
 *   focused={true}
 *   width={30}
 * />
 * ```
 */
export function HelpTree({
  topics = HELP_TOPICS,
  selectedId,
  onSelect,
  focused = true,
  maxHeight = 20,
  width = 35,
}: HelpTreeProps) {
  // Track expanded nodes
  const [expandedSet, setExpandedSet] = useState<Set<string>>(() =>
    getInitialExpanded(topics)
  );

  // Track selected index
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Track scroll offset
  const [scrollOffset, setScrollOffset] = useState(0);

  // Flatten the tree
  const flattenedNodes = useMemo(
    () => flattenTree(topics, expandedSet),
    [topics, expandedSet]
  );

  // Find index of selected ID if provided
  useEffect(() => {
    if (selectedId) {
      const idx = flattenedNodes.findIndex((n) => n.topic.id === selectedId);
      if (idx >= 0) {
        setSelectedIndex(idx);
      }
    }
  }, [selectedId, flattenedNodes]);

  // Ensure selected index is visible
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + maxHeight) {
      setScrollOffset(selectedIndex - maxHeight + 1);
    }
  }, [selectedIndex, scrollOffset, maxHeight]);

  // Toggle expand/collapse for a node
  const toggleExpand = useCallback((id: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Handle keyboard input
  useKeyboard(
    (key) => {
      if (!focused) return;

      const currentNode = flattenedNodes[selectedIndex];

      if (key.name === "up" || (key.name === "k" && !key.ctrl)) {
        // Move up
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (key.name === "down" || (key.name === "j" && !key.ctrl)) {
        // Move down
        setSelectedIndex((i) => Math.min(flattenedNodes.length - 1, i + 1));
      } else if (key.name === "home") {
        // Go to first
        setSelectedIndex(0);
        setScrollOffset(0);
      } else if (key.name === "end") {
        // Go to last
        setSelectedIndex(flattenedNodes.length - 1);
      } else if (key.name === "pageup") {
        // Page up
        setSelectedIndex((i) => Math.max(0, i - maxHeight));
      } else if (key.name === "pagedown") {
        // Page down
        setSelectedIndex((i) => Math.min(flattenedNodes.length - 1, i + maxHeight));
      } else if (key.name === "space" && currentNode?.hasChildren) {
        // Toggle expand/collapse
        toggleExpand(currentNode.topic.id);
      } else if (key.name === "return" && currentNode) {
        // Select or toggle
        if (currentNode.hasChildren) {
          toggleExpand(currentNode.topic.id);
        }
        onSelect?.(currentNode.topic);
      } else if (key.name === "right" && currentNode?.hasChildren && !currentNode.isExpanded) {
        // Expand
        toggleExpand(currentNode.topic.id);
      } else if (key.name === "left") {
        if (currentNode?.isExpanded && currentNode.hasChildren) {
          // Collapse
          toggleExpand(currentNode.topic.id);
        } else if (currentNode && currentNode.depth > 0) {
          // Navigate to parent
          for (let i = selectedIndex - 1; i >= 0; i--) {
            if (flattenedNodes[i]!.depth < currentNode.depth) {
              setSelectedIndex(i);
              break;
            }
          }
        }
      }
    },
    [focused, flattenedNodes, selectedIndex, toggleExpand, onSelect, maxHeight]
  );

  // Get visible nodes
  const visibleNodes = flattenedNodes.slice(scrollOffset, scrollOffset + maxHeight);

  // Calculate if we need scroll indicators
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + maxHeight < flattenedNodes.length;

  return (
    <box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? BORDER_COLORS.focused : BORDER_COLORS.default}
    >
      {/* Scroll up indicator */}
      {showScrollUp && (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg="gray">{"\u25B2"} more...</span>
          </text>
        </box>
      )}

      {/* Tree nodes */}
      {visibleNodes.map((node, idx) => (
        <TreeNode
          key={node.topic.id}
          node={node}
          isSelected={node.index === selectedIndex}
          isFocused={focused}
          width={width - 2}
          onToggle={() => toggleExpand(node.topic.id)}
          onSelect={() => {
            setSelectedIndex(node.index);
            onSelect?.(node.topic);
          }}
        />
      ))}

      {/* Scroll down indicator */}
      {showScrollDown && (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg="gray">{"\u25BC"} more...</span>
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
