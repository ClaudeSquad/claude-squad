/**
 * Command Prompt Component
 *
 * Input component with autocomplete integration for the REPL interface.
 * Handles command input, history navigation, and autocomplete triggers.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { Autocomplete, useAutocomplete } from "./autocomplete.js";
import type { Suggestion, AutocompleteResult } from "../../app/chat/types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the CommandPrompt component.
 */
export interface CommandPromptProps {
  /** Callback when user submits input */
  onSubmit: (input: string) => void;
  /** Callback to get autocomplete suggestions */
  onAutocomplete?: (input: string) => Promise<AutocompleteResult>;
  /** Prompt character/string */
  prompt?: string;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Command history for navigation */
  history?: string[];
  /** Whether the prompt is focused */
  focused?: boolean;
  /** Debounce time for autocomplete in ms */
  autocompleteDebounce?: number;
  /** Whether autocomplete is enabled */
  enableAutocomplete?: boolean;
}

// ============================================================================
// History Navigation Hook
// ============================================================================

/**
 * Hook for managing command history navigation.
 */
function useCommandHistory(history: string[]) {
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [savedInput, setSavedInput] = useState("");

  const navigateUp = useCallback(
    (currentInput: string): string | null => {
      if (history.length === 0) return null;

      if (historyIndex === -1) {
        // Save current input before navigating
        setSavedInput(currentInput);
      }

      const newIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(newIndex);

      return history[history.length - 1 - newIndex] ?? null;
    },
    [history, historyIndex]
  );

  const navigateDown = useCallback((): string | null => {
    if (historyIndex === -1) return null;

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);

    if (newIndex === -1) {
      // Return to saved input
      return savedInput;
    }

    return history[history.length - 1 - newIndex] ?? null;
  }, [history, historyIndex, savedInput]);

  const reset = useCallback(() => {
    setHistoryIndex(-1);
    setSavedInput("");
  }, []);

  return { navigateUp, navigateDown, reset, historyIndex };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Command Prompt Component
 *
 * REPL input with autocomplete and history support.
 *
 * @example
 * ```tsx
 * <CommandPrompt
 *   onSubmit={(input) => handleInput(input)}
 *   onAutocomplete={(input) => getAutocompleteSuggestions(input)}
 *   prompt="squad>"
 *   placeholder="Type a command or message..."
 *   history={commandHistory}
 * />
 * ```
 */
export function CommandPrompt({
  onSubmit,
  onAutocomplete,
  prompt = "❯",
  placeholder = "Type a command or message...",
  history = [],
  focused = true,
  autocompleteDebounce = 100,
  enableAutocomplete = true,
}: CommandPromptProps) {
  // Input state
  const [value, setValue] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);

  // Blinking cursor state
  const [cursorVisible, setCursorVisible] = useState(true);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Blinking cursor effect
  useEffect(() => {
    if (!focused) {
      setCursorVisible(false);
      return;
    }

    const interval = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => clearInterval(interval);
  }, [focused]);

  // History navigation
  const { navigateUp, navigateDown, reset: resetHistory } = useCommandHistory(history);

  // Autocomplete hook
  const autocomplete = useAutocomplete(suggestions);

  // Handle input changes
  const handleInputChange = useCallback(
    (newValue: string) => {
      setValue(newValue);
      setCursorPosition(newValue.length);
      resetHistory();

      // Trigger autocomplete
      if (enableAutocomplete && onAutocomplete && newValue.startsWith("/")) {
        // Clear existing debounce
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        // Debounce autocomplete
        debounceRef.current = setTimeout(async () => {
          try {
            const result = await onAutocomplete(newValue);
            setSuggestions(result.suggestions);
            setShowAutocomplete(result.suggestions.length > 0);
          } catch {
            setSuggestions([]);
            setShowAutocomplete(false);
          }
        }, autocompleteDebounce);
      } else {
        setSuggestions([]);
        setShowAutocomplete(false);
      }
    },
    [enableAutocomplete, onAutocomplete, autocompleteDebounce, resetHistory]
  );

  // Handle text input via keyboard events
  // Note: Character input is handled through the useKeyboard hook below
  // by detecting printable characters

  // Handle keyboard events
  useKeyboard((key) => {
    if (!focused) return;

    // Handle printable character input
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      const charCode = key.sequence.charCodeAt(0);
      // Printable ASCII characters (space to tilde)
      if (charCode >= 32 && charCode <= 126) {
        handleInputChange(value + key.sequence);
        return;
      }
    }

    // Submit on Enter (when autocomplete not showing or no selection)
    if (key.name === "return") {
      if (showAutocomplete && suggestions.length > 0) {
        // Apply autocomplete selection
        const selected = suggestions[autocomplete.selectedIndex];
        if (selected) {
          // If the selected text is the same as current input, submit instead of just applying
          if (selected.text === value.trim()) {
            onSubmit(value);
            setValue("");
            setCursorPosition(0);
            resetHistory();
            setShowAutocomplete(false);
            setSuggestions([]);
          } else {
            setValue(selected.text);
            setCursorPosition(selected.text.length);
            setShowAutocomplete(false);
            setSuggestions([]);
          }
        }
      } else if (value.trim()) {
        // Submit the input
        onSubmit(value);
        setValue("");
        setCursorPosition(0);
        resetHistory();
        setShowAutocomplete(false);
        setSuggestions([]);
      }
      return;
    }

    // Tab for autocomplete
    if (key.name === "tab") {
      if (showAutocomplete && suggestions.length > 0) {
        const selected = suggestions[autocomplete.selectedIndex];
        if (selected) {
          setValue(selected.text + " ");
          setCursorPosition(selected.text.length + 1);
          // Don't hide - trigger new autocomplete for arguments
          handleInputChange(selected.text + " ");
        }
      }
      return;
    }

    // Escape to close autocomplete or clear input
    if (key.name === "escape") {
      if (showAutocomplete) {
        setShowAutocomplete(false);
      } else if (value) {
        setValue("");
        setCursorPosition(0);
      }
      return;
    }

    // Backspace
    if (key.name === "backspace") {
      if (value.length > 0) {
        const newValue = value.slice(0, -1);
        handleInputChange(newValue);
      }
      return;
    }

    // Delete
    if (key.name === "delete") {
      if (cursorPosition < value.length) {
        const newValue = value.slice(0, cursorPosition) + value.slice(cursorPosition + 1);
        setValue(newValue);
      }
      return;
    }

    // Arrow up - history or autocomplete navigation
    if (key.name === "up") {
      if (showAutocomplete && suggestions.length > 0) {
        autocomplete.moveUp();
      } else {
        const historyValue = navigateUp(value);
        if (historyValue !== null) {
          setValue(historyValue);
          setCursorPosition(historyValue.length);
        }
      }
      return;
    }

    // Arrow down - history or autocomplete navigation
    if (key.name === "down") {
      if (showAutocomplete && suggestions.length > 0) {
        autocomplete.moveDown();
      } else {
        const historyValue = navigateDown();
        if (historyValue !== null) {
          setValue(historyValue);
          setCursorPosition(historyValue.length);
        }
      }
      return;
    }

    // Home
    if (key.name === "home" || (key.ctrl && key.name === "a")) {
      setCursorPosition(0);
      return;
    }

    // End
    if (key.name === "end" || (key.ctrl && key.name === "e")) {
      setCursorPosition(value.length);
      return;
    }

    // Ctrl+U - clear line
    if (key.ctrl && key.name === "u") {
      setValue("");
      setCursorPosition(0);
      setShowAutocomplete(false);
      return;
    }

    // Ctrl+W - delete word
    if (key.ctrl && key.name === "w") {
      const beforeCursor = value.slice(0, cursorPosition);
      const lastSpace = beforeCursor.lastIndexOf(" ");
      const newValue = value.slice(0, lastSpace + 1) + value.slice(cursorPosition);
      setValue(newValue);
      setCursorPosition(lastSpace + 1);
      return;
    }
  });

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Get terminal dimensions for responsive border width
  const { width: terminalWidth } = useTerminalDimensions();

  // Generate horizontal border line (full width minus padding)
  const borderWidth = Math.max(10, (terminalWidth || 80) - 4);
  const horizontalLine = "─".repeat(borderWidth);

  const showPlaceholder = !value;

  // Show argument hints when command has been committed (has space after command name)
  // e.g., "/feature " or "/sessions list" - user is now in argument entry mode
  const isCommandCommitted = value.startsWith("/") && value.includes(" ");

  return (
    <box flexDirection="column">
      {/* Autocomplete dropdown (positioned above input) */}
      {showAutocomplete && (
        <Autocomplete
          suggestions={suggestions}
          selectedIndex={autocomplete.selectedIndex}
          onSelectionChange={autocomplete.setSelectedIndex}
          onSelect={(suggestion) => {
            setValue(suggestion.text + " ");
            setCursorPosition(suggestion.text.length + 1);
            handleInputChange(suggestion.text + " ");
          }}
          onDismiss={() => setShowAutocomplete(false)}
          visible={showAutocomplete}
          showHints={isCommandCommitted}
        />
      )}

      {/* Top border line */}
      <text>
        <span fg="#3a3a4a">{horizontalLine}</span>
      </text>

      {/* Input row */}
      <box flexDirection="row" paddingLeft={2}>
        {/* Prompt */}
        <text>
          <span fg="white">{prompt} </span>
        </text>

        {/* Cursor when empty */}
        {showPlaceholder && focused && cursorVisible && (
          <text>
            <span fg="cyan">█</span>
          </text>
        )}

        {/* Input area */}
        {!showPlaceholder && (
          <text>
            <span fg={value.startsWith("/") ? "yellow" : "white"}>
              {value}
            </span>
            {focused && cursorVisible && (
              <span fg="cyan">█</span>
            )}
          </text>
        )}
      </box>

      {/* Bottom border line */}
      <text>
        <span fg="#3a3a4a">{horizontalLine}</span>
      </text>
    </box>
  );
}

// ============================================================================
// Simplified Text Input
// ============================================================================

/**
 * Simple text input without autocomplete.
 */
export function SimpleTextInput({
  value,
  onChange,
  onSubmit,
  placeholder = "",
  focused = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  focused?: boolean;
}) {
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

    if (key.name === "return" && onSubmit) {
      onSubmit(value);
    }

    if (key.name === "backspace" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  });

  return (
    <box>
      <text>
        {value ? (
          <span fg="white">{value}</span>
        ) : (
          <span fg="gray">{placeholder}</span>
        )}
        {focused && (
          <span fg="cyan">█</span>
        )}
      </text>
    </box>
  );
}

export default CommandPrompt;
