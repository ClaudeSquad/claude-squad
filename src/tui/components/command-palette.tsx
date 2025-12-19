/**
 * Command Palette Component
 *
 * A searchable command palette for quick access to actions.
 * Features fuzzy search, keyboard navigation, categories,
 * and recently used command tracking.
 */

import { useState, useMemo, useEffect, useRef, type ReactNode } from "react";
import {
  PRIMARY_COLORS,
  TEXT_COLORS,
  STATUS_ICONS,
  type TerminalColor,
} from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Command category for grouping.
 */
export type CommandCategory =
  | "navigation"
  | "agent"
  | "workflow"
  | "git"
  | "settings"
  | "help"
  | "recent";

/**
 * A command that can be executed from the palette.
 */
export interface Command {
  /** Unique command identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Category for grouping */
  category: CommandCategory;
  /** Keyboard shortcut (for display) */
  shortcut?: string;
  /** Icon character */
  icon?: string;
  /** Whether the command is disabled */
  disabled?: boolean;
  /** Command handler */
  onExecute: () => void;
  /** Keywords for search matching */
  keywords?: string[];
}

/**
 * Props for the CommandPalette component.
 */
export interface CommandPaletteProps {
  /** Whether the palette is visible */
  visible: boolean;
  /** Available commands */
  commands: Command[];
  /** Callback when palette should close */
  onClose: () => void;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Maximum visible commands (default: 10) */
  maxVisible?: number;
  /** Show recently used commands at top (default: true) */
  showRecent?: boolean;
  /** Recently used command IDs */
  recentCommandIds?: string[];
  /** Callback when a command is executed (for tracking recent) */
  onCommandExecute?: (commandId: string) => void;
  /** Terminal width for sizing */
  terminalWidth?: number;
  /** Terminal height for sizing */
  terminalHeight?: number;
}

/**
 * Fuzzy match result.
 */
interface FuzzyMatch {
  command: Command;
  score: number;
  matchedRanges: [number, number][];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Category display configuration.
 */
const CATEGORY_CONFIG: Record<
  CommandCategory,
  { label: string; color: TerminalColor; icon: string }
> = {
  recent: { label: "Recent", color: "yellow", icon: "★" },
  navigation: { label: "Navigation", color: "cyan", icon: "→" },
  agent: { label: "Agents", color: "green", icon: "●" },
  workflow: { label: "Workflow", color: "magenta", icon: "◆" },
  git: { label: "Git", color: "red", icon: "⌥" },
  settings: { label: "Settings", color: "blue", icon: "⚙" },
  help: { label: "Help", color: "gray", icon: "?" },
};

/**
 * Category display order.
 */
const CATEGORY_ORDER: CommandCategory[] = [
  "recent",
  "navigation",
  "agent",
  "workflow",
  "git",
  "settings",
  "help",
];

// ============================================================================
// Fuzzy Search
// ============================================================================

/**
 * Calculate fuzzy match score between query and text.
 * Returns -1 if no match, higher scores are better matches.
 */
function fuzzyMatch(query: string, text: string): { score: number; ranges: [number, number][] } {
  if (query.length === 0) {
    return { score: 0, ranges: [] };
  }

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Check for exact substring match first (highest score)
  const exactIndex = textLower.indexOf(queryLower);
  if (exactIndex !== -1) {
    return {
      score: 100 + (100 - exactIndex), // Prefer matches at start
      ranges: [[exactIndex, exactIndex + query.length]],
    };
  }

  // Fuzzy character matching
  let queryIndex = 0;
  let textIndex = 0;
  let score = 0;
  let consecutiveBonus = 0;
  const ranges: [number, number][] = [];
  let currentRangeStart: number | null = null;
  let lastMatchIndex = -2;

  while (queryIndex < queryLower.length && textIndex < textLower.length) {
    const queryChar = queryLower[queryIndex];
    const textChar = textLower[textIndex];

    if (queryChar === textChar) {
      // Match found
      score += 10;

      // Consecutive match bonus
      if (textIndex === lastMatchIndex + 1) {
        consecutiveBonus += 5;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      // Start of word bonus
      if (textIndex === 0 || /[\s\-_/]/.test(text[textIndex - 1] ?? "")) {
        score += 15;
      }

      // Track match range
      if (currentRangeStart === null) {
        currentRangeStart = textIndex;
      }
      lastMatchIndex = textIndex;
      queryIndex++;
    } else {
      // Close current range
      if (currentRangeStart !== null) {
        ranges.push([currentRangeStart, lastMatchIndex + 1]);
        currentRangeStart = null;
      }
    }
    textIndex++;
  }

  // Close final range
  if (currentRangeStart !== null) {
    ranges.push([currentRangeStart, lastMatchIndex + 1]);
  }

  // Return -1 if not all query characters matched
  if (queryIndex < queryLower.length) {
    return { score: -1, ranges: [] };
  }

  return { score, ranges };
}

/**
 * Search commands with fuzzy matching.
 */
function searchCommands(
  commands: Command[],
  query: string
): FuzzyMatch[] {
  if (query.length === 0) {
    return commands.map((command) => ({
      command,
      score: 0,
      matchedRanges: [],
    }));
  }

  const results: FuzzyMatch[] = [];

  for (const command of commands) {
    // Match against label
    const labelMatch = fuzzyMatch(query, command.label);

    // Match against description
    const descMatch = command.description
      ? fuzzyMatch(query, command.description)
      : { score: -1, ranges: [] };

    // Match against keywords
    let keywordScore = -1;
    if (command.keywords) {
      for (const keyword of command.keywords) {
        const kwMatch = fuzzyMatch(query, keyword);
        keywordScore = Math.max(keywordScore, kwMatch.score);
      }
    }

    // Use best match
    const bestScore = Math.max(labelMatch.score, descMatch.score * 0.8, keywordScore * 0.6);

    if (bestScore >= 0) {
      results.push({
        command,
        score: bestScore,
        matchedRanges: labelMatch.score >= 0 ? labelMatch.ranges : [],
      });
    }
  }

  // Sort by score (descending)
  return results.sort((a, b) => b.score - a.score);
}

// ============================================================================
// Sub-components
// ============================================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Search input field.
 */
function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <box
      flexDirection="row"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      gap={1}
    >
      <text>
        <span fg="cyan">{STATUS_ICONS.arrowRight}</span>
      </text>
      <box flexGrow={1}>
        <text>
          <span fg={value ? "white" : "gray"}>
            {value || placeholder || "Type to search commands..."}
          </span>
          <span fg="cyan">█</span>
        </text>
      </box>
    </box>
  );
}

interface CommandItemProps {
  command: Command;
  isSelected: boolean;
  matchedRanges: [number, number][];
}

/**
 * A single command item in the list.
 */
function CommandItem({ command, isSelected, matchedRanges }: CommandItemProps) {
  const categoryConfig = CATEGORY_CONFIG[command.category];

  // Render label with highlighted matches
  const renderLabel = () => {
    if (matchedRanges.length === 0) {
      return <span fg={isSelected ? "black" : "white"}>{command.label}</span>;
    }

    const parts: ReactNode[] = [];
    let lastIndex = 0;

    for (const [start, end] of matchedRanges) {
      // Text before match
      if (start > lastIndex) {
        parts.push(
          <span key={`pre-${start}`} fg={isSelected ? "black" : "white"}>
            {command.label.slice(lastIndex, start)}
          </span>
        );
      }
      // Matched text
      parts.push(
        <span key={`match-${start}`} fg={isSelected ? "black" : "yellow"} bold>
          {command.label.slice(start, end)}
        </span>
      );
      lastIndex = end;
    }

    // Text after last match
    if (lastIndex < command.label.length) {
      parts.push(
        <span key="post" fg={isSelected ? "black" : "white"}>
          {command.label.slice(lastIndex)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      backgroundColor={isSelected ? "cyan" : undefined}
    >
      {/* Left: Icon and label */}
      <box flexDirection="row" gap={1}>
        {/* Category icon */}
        <text>
          <span fg={isSelected ? "black" : categoryConfig.color}>
            {command.icon || categoryConfig.icon}
          </span>
        </text>

        {/* Label */}
        <text>{renderLabel()}</text>

        {/* Description */}
        {command.description && (
          <text>
            <span fg={isSelected ? "black" : "gray"}>
              {" "}
              - {command.description}
            </span>
          </text>
        )}

        {/* Disabled indicator */}
        {command.disabled && (
          <text>
            <span fg="gray"> (disabled)</span>
          </text>
        )}
      </box>

      {/* Right: Shortcut */}
      {command.shortcut && (
        <text>
          <span fg={isSelected ? "black" : "gray"}>{command.shortcut}</span>
        </text>
      )}
    </box>
  );
}

interface CategoryHeaderProps {
  category: CommandCategory;
}

/**
 * Category section header.
 */
function CategoryHeader({ category }: CategoryHeaderProps) {
  const config = CATEGORY_CONFIG[category];

  return (
    <box paddingLeft={1} paddingTop={1} height={2}>
      <text>
        <span fg={config.color} bold>
          {config.icon} {config.label}
        </span>
      </text>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * CommandPalette Component
 *
 * A searchable command palette for quick access to actions.
 *
 * Features:
 * - Fuzzy search matching
 * - Keyboard navigation (up/down arrows)
 * - Command categories
 * - Keyboard shortcuts display
 * - Recently used commands
 * - Match highlighting
 *
 * @example
 * ```tsx
 * const commands: Command[] = [
 *   {
 *     id: "new-feature",
 *     label: "New Feature",
 *     description: "Start a new feature workflow",
 *     category: "workflow",
 *     shortcut: "⌘+N",
 *     onExecute: () => router.navigate("new-feature"),
 *   },
 *   {
 *     id: "view-agents",
 *     label: "View Agents",
 *     category: "navigation",
 *     shortcut: "⌘+A",
 *     onExecute: () => router.navigate("agents"),
 *   },
 * ];
 *
 * <CommandPalette
 *   visible={showPalette}
 *   commands={commands}
 *   onClose={() => setShowPalette(false)}
 *   recentCommandIds={["new-feature"]}
 *   onCommandExecute={(id) => trackRecent(id)}
 * />
 * ```
 */
export function CommandPalette({
  visible,
  commands,
  onClose,
  placeholder = "Type to search commands...",
  maxVisible = 10,
  showRecent = true,
  recentCommandIds = [],
  onCommandExecute,
  terminalWidth = 120,
  terminalHeight = 40,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset state when palette opens
  useEffect(() => {
    if (visible) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [visible]);

  // Build command list with recent items
  const commandsWithRecent = useMemo(() => {
    if (!showRecent || recentCommandIds.length === 0) {
      return commands;
    }

    // Create recent category commands
    const recentCommands: Command[] = recentCommandIds
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is Command => c !== undefined)
      .slice(0, 3)
      .map((c) => ({
        ...c,
        category: "recent" as CommandCategory,
      }));

    return [...recentCommands, ...commands];
  }, [commands, recentCommandIds, showRecent]);

  // Filter and sort commands
  const filteredResults = useMemo(() => {
    return searchCommands(commandsWithRecent, query);
  }, [commandsWithRecent, query]);

  // Visible results
  const visibleResults = filteredResults.slice(0, maxVisible);

  // Group by category when not searching
  const groupedResults = useMemo(() => {
    if (query.length > 0) {
      return null; // Don't group when searching
    }

    const groups: Map<CommandCategory, FuzzyMatch[]> = new Map();
    for (const result of visibleResults) {
      const category = result.command.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(result);
    }

    // Sort groups by category order
    const sortedGroups: [CommandCategory, FuzzyMatch[]][] = [];
    for (const category of CATEGORY_ORDER) {
      const results = groups.get(category);
      if (results && results.length > 0) {
        sortedGroups.push([category, results]);
      }
    }

    return sortedGroups;
  }, [visibleResults, query]);

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Calculate dimensions
  const modalWidth = Math.min(Math.floor(terminalWidth * 0.6), 80);
  const modalHeight = Math.min(
    Math.floor(terminalHeight * 0.6),
    4 + visibleResults.length + (groupedResults?.length ?? 0)
  );
  const left = Math.floor((terminalWidth - modalWidth) / 2);
  const top = Math.floor((terminalHeight - modalHeight) / 4); // Position higher on screen

  // Handlers
  const handleSelectPrevious = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSelectNext = () => {
    setSelectedIndex((prev) => Math.min(visibleResults.length - 1, prev + 1));
  };

  const handleExecute = () => {
    const selected = visibleResults[selectedIndex];
    if (selected && !selected.command.disabled) {
      onCommandExecute?.(selected.command.id);
      selected.command.onExecute();
      onClose();
    }
  };

  // Flatten grouped results for index calculation
  const flatResults = groupedResults
    ? groupedResults.flatMap(([, results]) => results)
    : visibleResults;

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={modalWidth}
      height={modalHeight}
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
    >
      {/* Search input */}
      <SearchInput
        value={query}
        onChange={(value) => {
          setQuery(value);
          setSelectedIndex(0);
        }}
        placeholder={placeholder}
      />

      {/* Divider */}
      <box height={1} borderTop={1} borderColor="cyan" />

      {/* Results */}
      <box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleResults.length === 0 ? (
          <box padding={1}>
            <text>
              <span fg="gray">No commands found</span>
            </text>
          </box>
        ) : groupedResults ? (
          // Grouped view (no search query)
          <>
            {groupedResults.map(([category, results], groupIndex) => {
              // Calculate starting index for this group
              let startIndex = 0;
              for (let i = 0; i < groupIndex; i++) {
                startIndex += groupedResults[i][1].length;
              }

              return (
                <box key={category} flexDirection="column">
                  <CategoryHeader category={category} />
                  {results.map((result, index) => (
                    <CommandItem
                      key={result.command.id}
                      command={result.command}
                      isSelected={selectedIndex === startIndex + index}
                      matchedRanges={result.matchedRanges}
                    />
                  ))}
                </box>
              );
            })}
          </>
        ) : (
          // Flat view (search results)
          <>
            {visibleResults.map((result, index) => (
              <CommandItem
                key={result.command.id}
                command={result.command}
                isSelected={selectedIndex === index}
                matchedRanges={result.matchedRanges}
              />
            ))}
          </>
        )}

        {/* More results indicator */}
        {filteredResults.length > maxVisible && (
          <box paddingLeft={1}>
            <text>
              <span fg="gray">
                +{filteredResults.length - maxVisible} more results
              </span>
            </text>
          </box>
        )}
      </box>

      {/* Footer */}
      <box
        height={1}
        borderTop={1}
        borderColor="cyan"
        flexDirection="row"
        justifyContent="center"
        gap={2}
        paddingLeft={1}
        paddingRight={1}
      >
        <text>
          <span fg="gray">↑↓: Navigate</span>
        </text>
        <text>
          <span fg="gray">Enter: Execute</span>
        </text>
        <text>
          <span fg="gray">Esc: Close</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Hook for Command Registration
// ============================================================================

/**
 * Result of useCommandPalette hook.
 */
export interface UseCommandPaletteResult {
  /** Whether palette is visible */
  isOpen: boolean;
  /** Open the palette */
  open: () => void;
  /** Close the palette */
  close: () => void;
  /** Toggle palette visibility */
  toggle: () => void;
  /** Registered commands */
  commands: Command[];
  /** Register a command */
  registerCommand: (command: Command) => void;
  /** Unregister a command */
  unregisterCommand: (id: string) => void;
  /** Recently used command IDs */
  recentIds: string[];
  /** Track command execution */
  trackExecution: (id: string) => void;
}

/**
 * Hook for managing command palette state and commands.
 *
 * @example
 * ```tsx
 * function App() {
 *   const palette = useCommandPalette();
 *
 *   useEffect(() => {
 *     palette.registerCommand({
 *       id: "new-feature",
 *       label: "New Feature",
 *       category: "workflow",
 *       onExecute: () => console.log("New feature!"),
 *     });
 *   }, []);
 *
 *   return (
 *     <>
 *       <button onClick={palette.open}>Open Palette</button>
 *       <CommandPalette
 *         visible={palette.isOpen}
 *         commands={palette.commands}
 *         onClose={palette.close}
 *         recentCommandIds={palette.recentIds}
 *         onCommandExecute={palette.trackExecution}
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function useCommandPalette(): UseCommandPaletteResult {
  const [isOpen, setIsOpen] = useState(false);
  const [commands, setCommands] = useState<Command[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  const registerCommand = (command: Command) => {
    setCommands((prev) => {
      // Replace if exists, otherwise add
      const existing = prev.findIndex((c) => c.id === command.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = command;
        return updated;
      }
      return [...prev, command];
    });
  };

  const unregisterCommand = (id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  };

  const trackExecution = (id: string) => {
    setRecentIds((prev) => {
      // Move to front, keep max 10
      const filtered = prev.filter((i) => i !== id);
      return [id, ...filtered].slice(0, 10);
    });
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    commands,
    registerCommand,
    unregisterCommand,
    recentIds,
    trackExecution,
  };
}

// ============================================================================
// Default Commands
// ============================================================================

/**
 * Create default navigation commands.
 */
export function createNavigationCommands(
  navigate: (screen: string) => void
): Command[] {
  return [
    {
      id: "nav-dashboard",
      label: "Go to Dashboard",
      description: "View the main dashboard",
      category: "navigation",
      shortcut: "⌘+1",
      onExecute: () => navigate("dashboard"),
    },
    {
      id: "nav-agents",
      label: "Go to Agents",
      description: "View and manage agents",
      category: "navigation",
      shortcut: "⌘+2",
      onExecute: () => navigate("agents"),
    },
    {
      id: "nav-workflows",
      label: "Go to Workflows",
      description: "View and manage workflows",
      category: "navigation",
      shortcut: "⌘+3",
      onExecute: () => navigate("workflows"),
    },
    {
      id: "nav-features",
      label: "Go to Features",
      description: "View active features",
      category: "navigation",
      shortcut: "⌘+4",
      onExecute: () => navigate("features"),
    },
    {
      id: "nav-settings",
      label: "Go to Settings",
      description: "Configure preferences",
      category: "navigation",
      shortcut: "⌘+,",
      onExecute: () => navigate("settings"),
    },
  ];
}

/**
 * Create default help commands.
 */
export function createHelpCommands(handlers: {
  showHelp: () => void;
  showKeyboardShortcuts: () => void;
  showAbout: () => void;
}): Command[] {
  return [
    {
      id: "help-general",
      label: "Show Help",
      description: "View general help information",
      category: "help",
      shortcut: "?",
      onExecute: handlers.showHelp,
    },
    {
      id: "help-shortcuts",
      label: "Keyboard Shortcuts",
      description: "View all keyboard shortcuts",
      category: "help",
      shortcut: "⌘+/",
      onExecute: handlers.showKeyboardShortcuts,
    },
    {
      id: "help-about",
      label: "About Claude Squad",
      description: "View version and information",
      category: "help",
      onExecute: handlers.showAbout,
    },
  ];
}

// ============================================================================
// Exports
// ============================================================================

export default CommandPalette;
