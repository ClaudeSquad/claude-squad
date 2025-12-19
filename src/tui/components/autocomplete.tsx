/**
 * Autocomplete Component
 *
 * Dropdown component for displaying autocomplete suggestions.
 * Styled to match the Claude Squad welcome screen theme.
 */

import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { Suggestion, ArgumentHint } from "../../app/chat/types.js";

// ============================================================================
// Theme Colors (matching welcome screen)
// ============================================================================

const THEME = {
  // Text colors
  command: "#f0c674",       // Yellow for commands
  commandSelected: "#ffd700", // Brighter yellow when selected
  description: "#666666",   // Muted gray for descriptions
  descriptionSelected: "#888888", // Slightly brighter when selected
  accent: "#4ecdc4",        // Cyan/teal accent
  muted: "#555555",         // Very muted text
  white: "#ffffff",

  // Background colors
  bgDark: "#1a1a1a",        // Dark background
  bgSelected: "#2a3a4a",    // Selected item background (subtle blue tint)
  bgHeader: "#1a4a4a",      // Header background (matches tagline pill)
  border: "#3a3a4a",        // Border color
};

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the Autocomplete component.
 */
export interface AutocompleteProps {
  /** Suggestions to display */
  suggestions: Suggestion[];
  /** Currently selected index */
  selectedIndex?: number;
  /** Callback when selection changes */
  onSelectionChange?: (index: number) => void;
  /** Callback when a suggestion is selected (Enter pressed) */
  onSelect?: (suggestion: Suggestion) => void;
  /** Callback when autocomplete is dismissed (Escape pressed) */
  onDismiss?: () => void;
  /** Whether the dropdown is visible */
  visible?: boolean;
  /** Maximum items to show */
  maxVisible?: number;
  /** Position offset from input */
  offsetTop?: number;
  /** Whether to show argument hints */
  showHints?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Single suggestion item - clean, minimal design.
 */
function SuggestionItem({
  suggestion,
  isSelected,
  showHints,
  maxDescWidth,
}: {
  suggestion: Suggestion;
  isSelected: boolean;
  showHints: boolean;
  maxDescWidth: number;
}) {
  const bgColor = isSelected ? THEME.bgSelected : undefined;
  const commandColor = isSelected ? THEME.commandSelected : THEME.command;
  const descColor = isSelected ? THEME.descriptionSelected : THEME.description;

  // Format description - ensure proper spacing
  const description = truncateText(suggestion.description, maxDescWidth);

  return (
    <box flexDirection="column">
      <box
        flexDirection="row"
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={bgColor}
      >
        {/* Left side: icon + command */}
        <box flexDirection="row" width={20}>
          {suggestion.icon && (
            <text>
              <span fg={THEME.muted}>{suggestion.icon} </span>
            </text>
          )}
          <text>
            <span fg={commandColor}>{suggestion.displayText}</span>
          </text>
        </box>

        {/* Spacer */}
        <box flexGrow={1} />

        {/* Right side: description */}
        <text>
          <span fg={descColor}>{description}</span>
        </text>
      </box>

      {/* Argument hints (only for selected command) */}
      {isSelected && showHints && suggestion.argumentHints && suggestion.argumentHints.length > 0 && (
        <ArgumentHintsDisplay hints={suggestion.argumentHints} />
      )}
    </box>
  );
}

/**
 * Argument hints display - clean layout.
 */
function ArgumentHintsDisplay({ hints }: { hints: ArgumentHint[] }) {
  const required = hints.filter((h) => h.required);
  const optional = hints.filter((h) => !h.required);

  return (
    <box
      flexDirection="column"
      paddingLeft={3}
      paddingTop={1}
      paddingBottom={1}
      marginLeft={2}
      borderStyle="single"
      borderColor={THEME.border}
    >
      {required.length > 0 && (
        <box flexDirection="column">
          {required.map((hint, idx) => (
            <ArgumentHintItem key={hint.name} hint={hint} isFirst={idx === 0} />
          ))}
        </box>
      )}

      {optional.length > 0 && (
        <box flexDirection="column" paddingTop={required.length > 0 ? 1 : 0}>
          <text>
            <span fg={THEME.muted}>Optional:</span>
          </text>
          {optional.map((hint) => (
            <ArgumentHintItem key={hint.name} hint={hint} isFirst={false} />
          ))}
        </box>
      )}
    </box>
  );
}

/**
 * Single argument hint item - inline format.
 */
function ArgumentHintItem({ hint, isFirst }: { hint: ArgumentHint; isFirst: boolean }) {
  // Format: name (type) - description
  // Example: list
  const exampleText = hint.examples && hint.examples.length > 0
    ? `Example: ${hint.examples[0]}`
    : "";

  return (
    <box flexDirection="column" paddingLeft={1}>
      <box flexDirection="row">
        <text>
          <span fg={THEME.accent}>{hint.name}</span>
          <span fg={THEME.muted}> ({hint.type})</span>
          {hint.required && <span fg={THEME.command}> *</span>}
        </text>
      </box>
      {hint.description && (
        <box paddingLeft={2}>
          <text>
            <span fg={THEME.description}>{hint.description}</span>
          </text>
        </box>
      )}
      {exampleText && (
        <box paddingLeft={2}>
          <text>
            <span fg={THEME.muted}>{exampleText}</span>
          </text>
        </box>
      )}
    </box>
  );
}

/**
 * Truncate text to a maximum length.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Autocomplete Dropdown Component
 *
 * Displays autocomplete suggestions with keyboard navigation support.
 * Styled to match the Claude Squad welcome screen theme.
 *
 * @example
 * ```tsx
 * <Autocomplete
 *   suggestions={[
 *     { text: "/feature", displayText: "/feature", description: "Start a new feature", ... },
 *     { text: "/help", displayText: "/help", description: "Show help", ... }
 *   ]}
 *   visible={true}
 *   onSelect={(suggestion) => console.log("Selected:", suggestion)}
 * />
 * ```
 */
export function Autocomplete({
  suggestions,
  selectedIndex: controlledIndex,
  onSelectionChange,
  onSelect,
  onDismiss,
  visible = true,
  maxVisible = 8,
  showHints = true,
}: AutocompleteProps) {
  // Internal state for uncontrolled mode
  const [internalIndex, setInternalIndex] = useState(0);

  // Fixed description width (avoids potential issues with dimension hooks)
  const maxDescWidth = 40;

  // Use controlled or internal index
  const selectedIndex = controlledIndex ?? internalIndex;
  const setSelectedIndex = onSelectionChange ?? setInternalIndex;

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions.length, setSelectedIndex]);

  // Handle keyboard navigation
  useKeyboard((key) => {
    if (!visible || suggestions.length === 0) return;

    // Arrow up
    if (key.name === "up" || (key.ctrl && key.name === "p")) {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
      setSelectedIndex(newIndex);
    }

    // Arrow down
    if (key.name === "down" || (key.ctrl && key.name === "n")) {
      const newIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
      setSelectedIndex(newIndex);
    }

    // Tab or Enter to select
    if (key.name === "tab" || key.name === "return") {
      const selected = suggestions[selectedIndex];
      if (selected && onSelect) {
        onSelect(selected);
      }
    }

    // Escape to dismiss
    if (key.name === "escape") {
      onDismiss?.();
    }
  });

  // Don't render if not visible or no suggestions
  if (!visible || suggestions.length === 0) {
    return null;
  }

  // Calculate visible window (handle scroll offset for many items)
  const scrollOffset = Math.max(0, Math.min(selectedIndex - Math.floor(maxVisible / 2), suggestions.length - maxVisible));
  const visibleSuggestions = suggestions.slice(scrollOffset, scrollOffset + maxVisible);
  const hasMore = suggestions.length > maxVisible;

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={THEME.border}
    >
      {/* Suggestions list */}
      <box flexDirection="column">
        {visibleSuggestions.map((suggestion, index) => (
          <SuggestionItem
            key={`${suggestion.text}-${scrollOffset + index}`}
            suggestion={suggestion}
            isSelected={scrollOffset + index === selectedIndex}
            showHints={showHints}
            maxDescWidth={maxDescWidth}
          />
        ))}
      </box>

      {/* More indicator */}
      {hasMore && (
        <box paddingLeft={2}>
          <text>
            <span fg={THEME.muted}>
              {scrollOffset > 0 ? "↑ " : "  "}
              {suggestions.length} commands
              {scrollOffset + maxVisible < suggestions.length ? " ↓" : ""}
            </span>
          </text>
        </box>
      )}

      {/* Navigation hints - minimal, matching theme */}
      <box
        flexDirection="row"
        gap={2}
        paddingLeft={1}
        paddingRight={1}
      >
        <text>
          <span fg={THEME.muted}>↑↓</span>
          <span fg={THEME.description}> Navigate  </span>
        </text>
        <text>
          <span fg={THEME.muted}>Tab</span>
          <span fg={THEME.description}> Select  </span>
        </text>
        <text>
          <span fg={THEME.muted}>Esc</span>
          <span fg={THEME.description}> Close</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Hook for Autocomplete State
// ============================================================================

/**
 * Hook for managing autocomplete state.
 */
export function useAutocomplete(suggestions: Suggestion[]) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Reset when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
    setIsVisible(suggestions.length > 0);
  }, [suggestions]);

  const moveUp = useCallback(() => {
    setSelectedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
  }, [suggestions.length]);

  const moveDown = useCallback(() => {
    setSelectedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
  }, [suggestions.length]);

  const select = useCallback(() => {
    return suggestions[selectedIndex];
  }, [suggestions, selectedIndex]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
  }, []);

  const show = useCallback(() => {
    setIsVisible(true);
  }, []);

  return {
    selectedIndex,
    setSelectedIndex,
    isVisible,
    setIsVisible,
    moveUp,
    moveDown,
    select,
    dismiss,
    show,
    selectedSuggestion: suggestions[selectedIndex],
  };
}

export default Autocomplete;
