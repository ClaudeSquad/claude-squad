/**
 * Autocomplete Component
 *
 * Dropdown component for displaying autocomplete suggestions.
 * Supports keyboard navigation and selection.
 */

import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "@opentui/react";
import type { Suggestion, ArgumentHint } from "../../app/chat/types.js";

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
 * Single suggestion item.
 */
function SuggestionItem({
  suggestion,
  isSelected,
  showHints,
}: {
  suggestion: Suggestion;
  isSelected: boolean;
  showHints: boolean;
}) {
  const bgColor = isSelected ? "blue" : undefined;
  const textColor = isSelected ? "white" : "gray";

  return (
    <box flexDirection="column">
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        backgroundColor={bgColor}
      >
        {/* Command/suggestion text */}
        <box flexDirection="row" gap={1}>
          {suggestion.icon && (
            <text>
              <span>{suggestion.icon}</span>
            </text>
          )}
          <text>
            <span fg={isSelected ? "white" : "yellow"}>
              {suggestion.displayText}
            </span>
          </text>
        </box>

        {/* Description */}
        <box maxWidth="60%">
          <text>
            <span fg={textColor}>{truncateText(suggestion.description, 40)}</span>
          </text>
        </box>
      </box>

      {/* Argument hints (only for selected command) */}
      {isSelected && showHints && suggestion.argumentHints && suggestion.argumentHints.length > 0 && (
        <ArgumentHintsDisplay hints={suggestion.argumentHints} />
      )}
    </box>
  );
}

/**
 * Argument hints display.
 */
function ArgumentHintsDisplay({ hints }: { hints: ArgumentHint[] }) {
  const required = hints.filter((h) => h.required);
  const optional = hints.filter((h) => !h.required);

  return (
    <box
      flexDirection="column"
      paddingLeft={2}
      paddingTop={1}
      borderStyle="single"
      borderColor="gray"
    >
      {required.length > 0 && (
        <>
          <text>
            <span fg="white">REQUIRED:</span>
          </text>
          {required.map((hint) => (
            <ArgumentHintItem key={hint.name} hint={hint} />
          ))}
        </>
      )}

      {optional.length > 0 && (
        <>
          <text>
            <span fg="gray">OPTIONAL:</span>
          </text>
          {optional.map((hint) => (
            <ArgumentHintItem key={hint.name} hint={hint} />
          ))}
        </>
      )}
    </box>
  );
}

/**
 * Single argument hint item.
 */
function ArgumentHintItem({ hint }: { hint: ArgumentHint }) {
  return (
    <box flexDirection="column" paddingLeft={2}>
      <box flexDirection="row" gap={1}>
        <text>
          <span fg="cyan">{hint.name}</span>
        </text>
        <text>
          <span fg="gray">({hint.type})</span>
        </text>
      </box>
      {hint.description && (
        <box paddingLeft={2}>
          <text>
            <span fg="gray">{hint.description}</span>
          </text>
        </box>
      )}
      {hint.examples && hint.examples.length > 0 && (
        <box paddingLeft={2}>
          <text>
            <span fg="gray">Example: </span>
            <span fg="white">{hint.examples[0]}</span>
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
  maxVisible = 10,
  showHints = true,
}: AutocompleteProps) {
  // Internal state for uncontrolled mode
  const [internalIndex, setInternalIndex] = useState(0);

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

  // Calculate visible window
  const visibleSuggestions = suggestions.slice(0, maxVisible);
  const hasMore = suggestions.length > maxVisible;

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      backgroundColor="black"
    >
      {/* Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        backgroundColor="gray"
      >
        <text>
          <span fg="white">Suggestions</span>
        </text>
        <text>
          <span fg="white">{suggestions.length} match{suggestions.length !== 1 ? "es" : ""}</span>
        </text>
      </box>

      {/* Suggestions list */}
      <box flexDirection="column">
        {visibleSuggestions.map((suggestion, index) => (
          <SuggestionItem
            key={`${suggestion.text}-${index}`}
            suggestion={suggestion}
            isSelected={index === selectedIndex}
            showHints={showHints}
          />
        ))}
      </box>

      {/* More indicator */}
      {hasMore && (
        <box paddingLeft={1}>
          <text>
            <span fg="gray">... and {suggestions.length - maxVisible} more</span>
          </text>
        </box>
      )}

      {/* Navigation hints */}
      <box
        flexDirection="row"
        gap={2}
        paddingLeft={1}
        paddingRight={1}
        backgroundColor="gray"
      >
        <text>
          <span fg="white">↑↓ Navigate</span>
        </text>
        <text>
          <span fg="white">Tab Select</span>
        </text>
        <text>
          <span fg="white">Esc Close</span>
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
