/**
 * ListView Component
 *
 * A scrollable list with keyboard navigation, selection highlighting,
 * virtualized scrolling for performance, and optional search/filter.
 */

import { useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import { BORDER_COLORS, TEXT_COLORS, BACKGROUND_COLORS } from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the ListView component.
 */
export interface ListViewProps<T> {
  /** Array of items to display */
  items: T[];
  /** Currently selected item index (controlled mode) */
  selectedIndex?: number;
  /** Callback when selection changes */
  onSelectionChange?: (index: number, item: T) => void;
  /** Callback when item is activated (Enter key) */
  onItemActivate?: (index: number, item: T) => void;
  /** Custom render function for each item */
  renderItem: (item: T, index: number, isSelected: boolean) => ReactNode;
  /** Function to extract a unique key from each item */
  keyExtractor?: (item: T, index: number) => string;
  /** Message to display when list is empty */
  emptyMessage?: string;
  /** Maximum number of visible items (enables virtualization) */
  maxVisibleItems?: number;
  /** Whether the list is focused (enables keyboard navigation) */
  focused?: boolean;
  /** Width of the list container */
  width?: number | string;
  /** Height of the list container */
  height?: number | string;
  /** Flex grow value */
  flexGrow?: number;
  /** Enable search/filter mode */
  searchable?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Function to filter items based on search query */
  filterFn?: (item: T, query: string) => boolean;
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void;
  /** Show item indices (1-9) for quick selection */
  showIndices?: boolean;
  /** Callback when an item is deleted (Delete/Backspace key) */
  onItemDelete?: (index: number, item: T) => void;
}

/**
 * State returned by the useListView hook.
 */
export interface ListViewState<T> {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  selectedItem: T | undefined;
  moveUp: () => void;
  moveDown: () => void;
  moveToTop: () => void;
  moveToBottom: () => void;
  pageUp: () => void;
  pageDown: () => void;
  selectByIndex: (index: number) => void;
}

// ============================================================================
// Hook: useListView
// ============================================================================

/**
 * Hook for managing list view state with keyboard navigation support.
 */
export function useListView<T>(
  items: T[],
  options: {
    initialIndex?: number;
    pageSize?: number;
    onChange?: (index: number, item: T) => void;
  } = {}
): ListViewState<T> {
  const { initialIndex = 0, pageSize = 10, onChange } = options;
  const [selectedIndex, setSelectedIndexInternal] = useState(
    Math.min(initialIndex, Math.max(0, items.length - 1))
  );

  // Clamp selected index when items change
  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndexInternal(0);
    } else if (selectedIndex >= items.length) {
      setSelectedIndexInternal(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  const setSelectedIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setSelectedIndexInternal(clampedIndex);
      if (onChange && items[clampedIndex]) {
        onChange(clampedIndex, items[clampedIndex]);
      }
    },
    [items, onChange]
  );

  const moveUp = useCallback(() => {
    setSelectedIndex(selectedIndex - 1);
  }, [selectedIndex, setSelectedIndex]);

  const moveDown = useCallback(() => {
    setSelectedIndex(selectedIndex + 1);
  }, [selectedIndex, setSelectedIndex]);

  const moveToTop = useCallback(() => {
    setSelectedIndex(0);
  }, [setSelectedIndex]);

  const moveToBottom = useCallback(() => {
    setSelectedIndex(items.length - 1);
  }, [items.length, setSelectedIndex]);

  const pageUp = useCallback(() => {
    setSelectedIndex(Math.max(0, selectedIndex - pageSize));
  }, [selectedIndex, pageSize, setSelectedIndex]);

  const pageDown = useCallback(() => {
    setSelectedIndex(Math.min(items.length - 1, selectedIndex + pageSize));
  }, [selectedIndex, pageSize, items.length, setSelectedIndex]);

  const selectByIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        setSelectedIndex(index);
      }
    },
    [items.length, setSelectedIndex]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    selectedItem: items[selectedIndex],
    moveUp,
    moveDown,
    moveToTop,
    moveToBottom,
    pageUp,
    pageDown,
    selectByIndex,
  };
}

// ============================================================================
// Search Input Sub-component
// ============================================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  focused: boolean;
}

/**
 * Search input for filtering list items.
 */
function SearchInput({ value, onChange, placeholder, focused }: SearchInputProps) {
  useKeyboard((key) => {
    if (!focused) return;

    // Handle printable character input
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      const charCode = key.sequence.charCodeAt(0);
      // Printable ASCII characters (space to tilde)
      if (charCode >= 32 && charCode <= 126) {
        onChange(value + key.sequence);
        return;
      }
    }

    if (key.name === "backspace" && value.length > 0) {
      onChange(value.slice(0, -1));
    }

    // Ctrl+U to clear
    if (key.ctrl && key.name === "u") {
      onChange("");
    }
  });

  return (
    <box
      flexDirection="row"
      height={1}
      paddingLeft={1}
      paddingRight={1}
      borderBottom
      borderColor={BORDER_COLORS.muted}
    >
      <text>
        <span fg="cyan">/</span>
        <span fg="white">{value}</span>
        {focused && value.length === 0 && (
          <span fg="gray">{placeholder}</span>
        )}
        {focused && (
          <span fg="black" bg="white">{" "}</span>
        )}
      </text>
    </box>
  );
}

// ============================================================================
// Empty State Sub-component
// ============================================================================

interface EmptyStateProps {
  message: string;
}

/**
 * Empty state display when list has no items.
 */
function EmptyState({ message }: EmptyStateProps) {
  return (
    <box flexGrow={1} justifyContent="center" alignItems="center">
      <text>
        <span fg={TEXT_COLORS.dimmed}>{message}</span>
      </text>
    </box>
  );
}

// ============================================================================
// Scroll Indicator Sub-component
// ============================================================================

interface ScrollIndicatorProps {
  scrollOffset: number;
  totalItems: number;
  visibleItems: number;
  height: number;
}

/**
 * Vertical scroll indicator showing position in list.
 */
function ScrollIndicator({
  scrollOffset,
  totalItems,
  visibleItems,
  height,
}: ScrollIndicatorProps) {
  if (totalItems <= visibleItems) {
    return null;
  }

  // Calculate thumb position and size
  const thumbSize = Math.max(1, Math.floor(height * (visibleItems / totalItems)));
  const maxScroll = totalItems - visibleItems;
  const thumbPosition = maxScroll > 0
    ? Math.floor((scrollOffset / maxScroll) * (height - thumbSize))
    : 0;

  // Build scroll track
  const track: string[] = [];
  for (let i = 0; i < height; i++) {
    if (i >= thumbPosition && i < thumbPosition + thumbSize) {
      track.push("\u2588"); // Full block for thumb
    } else {
      track.push("\u2591"); // Light shade for track
    }
  }

  return (
    <box width={1} flexDirection="column">
      {track.map((char, i) => (
        <text key={i}>
          <span fg="gray">{char}</span>
        </text>
      ))}
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ListView Component
 *
 * A feature-rich list component with keyboard navigation, virtualized scrolling,
 * selection highlighting, and optional search/filter capability.
 *
 * @example
 * ```tsx
 * // Basic list with selection
 * <ListView
 *   items={agents}
 *   renderItem={(agent, index, isSelected) => (
 *     <text color={isSelected ? 'cyan' : 'white'}>
 *       {agent.name}
 *     </text>
 *   )}
 *   onItemActivate={(index, agent) => openAgent(agent)}
 * />
 *
 * // Searchable list with custom empty message
 * <ListView
 *   items={commands}
 *   searchable
 *   searchPlaceholder="Filter commands..."
 *   filterFn={(cmd, query) => cmd.name.includes(query)}
 *   emptyMessage="No commands found"
 *   renderItem={(cmd, i, sel) => <CommandItem cmd={cmd} selected={sel} />}
 * />
 *
 * // Virtualized list for large datasets
 * <ListView
 *   items={logs}
 *   maxVisibleItems={20}
 *   renderItem={(log, i, sel) => <LogEntry log={log} />}
 *   showIndices={false}
 * />
 * ```
 */
export function ListView<T>({
  items,
  selectedIndex: controlledSelectedIndex,
  onSelectionChange,
  onItemActivate,
  renderItem,
  keyExtractor = (_, index) => String(index),
  emptyMessage = "No items",
  maxVisibleItems = 10,
  focused = true,
  width,
  height,
  flexGrow,
  searchable = false,
  searchPlaceholder = "Search...",
  filterFn,
  onSearchChange,
  showIndices = true,
  onItemDelete,
}: ListViewProps<T>) {
  // Internal selection state for uncontrolled mode
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);

  // Search query state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Use controlled or internal selection state
  const selectedIndex = controlledSelectedIndex ?? internalSelectedIndex;
  const setSelectedIndex = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      if (onSelectionChange && items[clampedIndex]) {
        onSelectionChange(clampedIndex, items[clampedIndex]);
      } else {
        setInternalSelectedIndex(clampedIndex);
      }
    },
    [items, onSelectionChange]
  );

  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchable || !searchQuery || !filterFn) {
      return items;
    }
    return items.filter((item) => filterFn(item, searchQuery));
  }, [items, searchable, searchQuery, filterFn]);

  // Scroll offset for virtualization
  const [scrollOffset, setScrollOffset] = useState(0);

  // Reset selection when filtered items change
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex, setSelectedIndex]);

  // Adjust scroll offset when selection changes
  useEffect(() => {
    // Keep selected item visible
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + maxVisibleItems) {
      setScrollOffset(selectedIndex - maxVisibleItems + 1);
    }
  }, [selectedIndex, scrollOffset, maxVisibleItems]);

  // Handle search query changes
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      onSearchChange?.(query);
      // Reset selection when search changes
      setSelectedIndex(0);
      setScrollOffset(0);
    },
    [onSearchChange, setSelectedIndex]
  );

  // Handle keyboard navigation
  useKeyboard((key) => {
    if (!focused) return;

    // Toggle search focus with /
    if (searchable && key.sequence === "/" && !isSearchFocused) {
      setIsSearchFocused(true);
      return;
    }

    // Exit search with Escape
    if (isSearchFocused && key.name === "escape") {
      setIsSearchFocused(false);
      setSearchQuery("");
      handleSearchChange("");
      return;
    }

    // If search is focused, let search input handle keys
    if (isSearchFocused) {
      return;
    }

    // Arrow up
    if (key.name === "up" || (key.ctrl && key.name === "p")) {
      if (filteredItems.length > 0) {
        const newIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredItems.length - 1;
        setSelectedIndex(newIndex);
      }
      return;
    }

    // Arrow down
    if (key.name === "down" || (key.ctrl && key.name === "n")) {
      if (filteredItems.length > 0) {
        const newIndex = selectedIndex < filteredItems.length - 1 ? selectedIndex + 1 : 0;
        setSelectedIndex(newIndex);
      }
      return;
    }

    // Page up
    if (key.name === "pageup") {
      setSelectedIndex(Math.max(0, selectedIndex - maxVisibleItems));
      return;
    }

    // Page down
    if (key.name === "pagedown") {
      setSelectedIndex(Math.min(filteredItems.length - 1, selectedIndex + maxVisibleItems));
      return;
    }

    // Home - go to first item
    if (key.name === "home" || (key.ctrl && key.name === "home")) {
      setSelectedIndex(0);
      return;
    }

    // End - go to last item
    if (key.name === "end" || (key.ctrl && key.name === "end")) {
      setSelectedIndex(filteredItems.length - 1);
      return;
    }

    // Enter - activate selected item
    if (key.name === "return") {
      if (filteredItems[selectedIndex] && onItemActivate) {
        onItemActivate(selectedIndex, filteredItems[selectedIndex]);
      }
      return;
    }

    // Delete/Backspace - delete item
    if ((key.name === "delete" || key.name === "backspace") && !searchable) {
      if (filteredItems[selectedIndex] && onItemDelete) {
        onItemDelete(selectedIndex, filteredItems[selectedIndex]);
      }
      return;
    }

    // Number keys 1-9 for quick selection
    if (showIndices && key.sequence && /^[1-9]$/.test(key.sequence)) {
      const targetIndex = scrollOffset + parseInt(key.sequence, 10) - 1;
      if (targetIndex < filteredItems.length) {
        setSelectedIndex(targetIndex);
        if (onItemActivate && filteredItems[targetIndex]) {
          onItemActivate(targetIndex, filteredItems[targetIndex]);
        }
      }
      return;
    }

    // Vim-style navigation
    if (key.sequence === "j") {
      if (filteredItems.length > 0) {
        setSelectedIndex(Math.min(filteredItems.length - 1, selectedIndex + 1));
      }
      return;
    }
    if (key.sequence === "k") {
      if (filteredItems.length > 0) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      }
      return;
    }
    if (key.sequence === "g" && key.ctrl) {
      setSelectedIndex(0);
      return;
    }
    if (key.sequence === "G") {
      setSelectedIndex(filteredItems.length - 1);
      return;
    }
  });

  // Calculate visible items window
  const visibleItems = filteredItems.slice(
    scrollOffset,
    scrollOffset + maxVisibleItems
  );
  const showScrollbar = filteredItems.length > maxVisibleItems;

  return (
    <box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      {/* Search input */}
      {searchable && (
        <SearchInput
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={searchPlaceholder}
          focused={isSearchFocused}
        />
      )}

      {/* List content */}
      <box flexDirection="row" flexGrow={1}>
        {/* Items */}
        <box flexDirection="column" flexGrow={1}>
          {filteredItems.length === 0 ? (
            <EmptyState message={emptyMessage} />
          ) : (
            visibleItems.map((item, visibleIndex) => {
              const actualIndex = scrollOffset + visibleIndex;
              const isSelected = actualIndex === selectedIndex;
              const displayIndex = visibleIndex + 1;

              return (
                <box
                  key={keyExtractor(item, actualIndex)}
                  flexDirection="row"
                  backgroundColor={isSelected ? BACKGROUND_COLORS.selection : undefined}
                >
                  {/* Index indicator */}
                  {showIndices && displayIndex <= 9 && (
                    <box width={3}>
                      <text>
                        <span fg={isSelected ? "white" : "gray"}>
                          {displayIndex}.
                        </span>
                      </text>
                    </box>
                  )}
                  {showIndices && displayIndex > 9 && (
                    <box width={3}>
                      <text>
                        <span fg="gray">{"  "}</span>
                      </text>
                    </box>
                  )}

                  {/* Item content */}
                  <box flexGrow={1}>{renderItem(item, actualIndex, isSelected)}</box>
                </box>
              );
            })
          )}
        </box>

        {/* Scroll indicator */}
        {showScrollbar && (
          <ScrollIndicator
            scrollOffset={scrollOffset}
            totalItems={filteredItems.length}
            visibleItems={maxVisibleItems}
            height={Math.min(maxVisibleItems, filteredItems.length)}
          />
        )}
      </box>

      {/* Navigation hints */}
      {focused && filteredItems.length > 0 && (
        <box
          height={1}
          paddingLeft={1}
          paddingRight={1}
          borderTop
          borderColor={BORDER_COLORS.muted}
        >
          <text>
            <span fg="gray">
              {selectedIndex + 1}/{filteredItems.length}
              {" | "}
              {"\u2191\u2193"} Navigate
              {" | "}
              Enter Select
              {searchable && " | / Search"}
            </span>
          </text>
        </box>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ListView;
