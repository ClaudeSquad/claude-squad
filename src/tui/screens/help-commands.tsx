/**
 * Help Commands Screen
 *
 * Displays all commands grouped by category with detailed information.
 * Provides keyboard navigation and command selection.
 */

import { useState, useCallback, useMemo } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import { registerScreen, useRouter } from "../router.js";
import { BORDER_COLORS, TEXT_COLORS, PRIMARY_COLORS } from "../theme/index.js";
import { HELP_TOPICS, findTopicById } from "../components/help/index.js";
import type { HelpTopic, CommandCategory } from "../components/help/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for HelpCommandsScreen.
 */
export interface HelpCommandsScreenProps {
  /** Router params */
  params?: Record<string, unknown>;
}

/**
 * Command info extracted from help data.
 */
interface CommandInfo {
  command: string;
  description: string;
  topic: HelpTopic;
}

/**
 * Category group with commands.
 */
interface CategoryGroup {
  category: CommandCategory;
  label: string;
  icon: string;
  commands: CommandInfo[];
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_CONFIG: Record<CommandCategory, { label: string; icon: string }> = {
  session: { label: "Session Commands", icon: "\u23F1" }, // Timer
  feature: { label: "Feature Commands", icon: "\u2728" }, // Sparkles
  agent: { label: "Agent Commands", icon: "\u2699" }, // Gear
  config: { label: "Configuration Commands", icon: "\u2692" }, // Hammer
  info: { label: "Information Commands", icon: "\u2139" }, // Info
  system: { label: "System Commands", icon: "\u2328" }, // Keyboard
};

const CATEGORY_ORDER: CommandCategory[] = [
  "session",
  "feature",
  "agent",
  "config",
  "info",
  "system",
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract commands from help topics tree.
 */
function extractCommands(topics: HelpTopic[]): CategoryGroup[] {
  const groups = new Map<CommandCategory, CommandInfo[]>();

  // Initialize all categories
  for (const category of CATEGORY_ORDER) {
    groups.set(category, []);
  }

  // Find commands section
  const commandsSection = findTopicById(topics, "commands");
  if (!commandsSection?.children) {
    return [];
  }

  // Iterate through category sections
  for (const categoryTopic of commandsSection.children) {
    // Determine category from ID
    let category: CommandCategory | null = null;
    if (categoryTopic.id.includes("session")) category = "session";
    else if (categoryTopic.id.includes("feature")) category = "feature";
    else if (categoryTopic.id.includes("agent")) category = "agent";
    else if (categoryTopic.id.includes("config")) category = "config";
    else if (categoryTopic.id.includes("info")) category = "info";
    else if (categoryTopic.id.includes("system")) category = "system";

    if (!category || !categoryTopic.children) continue;

    const categoryCommands = groups.get(category) || [];

    // Extract commands from category
    for (const cmdTopic of categoryTopic.children) {
      if (cmdTopic.command) {
        categoryCommands.push({
          command: `/${cmdTopic.command}`,
          description: cmdTopic.description || "",
          topic: cmdTopic,
        });
      }
    }

    groups.set(category, categoryCommands);
  }

  // Build result in order
  const result: CategoryGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const commands = groups.get(category) || [];
    if (commands.length > 0) {
      const config = CATEGORY_CONFIG[category];
      result.push({
        category,
        label: config.label,
        icon: config.icon,
        commands,
      });
    }
  }

  return result;
}

/**
 * Flatten all commands for navigation.
 */
function flattenCommands(groups: CategoryGroup[]): CommandInfo[] {
  const result: CommandInfo[] = [];
  for (const group of groups) {
    result.push(...group.commands);
  }
  return result;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Category header.
 */
function CategoryHeader({
  label,
  icon,
}: {
  label: string;
  icon: string;
}) {
  return (
    <box height={1} paddingTop={1}>
      <text>
        <span fg="yellow" bold>
          {icon} {label}
        </span>
      </text>
    </box>
  );
}

/**
 * Command row.
 */
function CommandRow({
  command,
  description,
  isSelected,
  isFocused,
  width,
}: {
  command: string;
  description: string;
  isSelected: boolean;
  isFocused: boolean;
  width: number;
}) {
  const commandWidth = 20;
  const descWidth = width - commandWidth - 4;

  const truncatedDesc =
    description.length > descWidth
      ? description.substring(0, descWidth - 1) + "\u2026"
      : description;

  const bgColor = isSelected && isFocused ? "cyan" : undefined;
  const cmdColor = isSelected && isFocused ? "black" : "green";
  const descColor = isSelected && isFocused ? "black" : "gray";

  return (
    <box height={1}>
      <text>
        {isSelected && isFocused ? (
          <span bg={bgColor}>
            <span fg={cmdColor}>{command.padEnd(commandWidth)}</span>
            <span fg={descColor}>{truncatedDesc.padEnd(descWidth)}</span>
          </span>
        ) : (
          <>
            <span fg={cmdColor}>{command.padEnd(commandWidth)}</span>
            <span fg={descColor}>{truncatedDesc}</span>
          </>
        )}
      </text>
    </box>
  );
}

/**
 * Command detail panel.
 */
function CommandDetail({
  command,
  topic,
  width,
}: {
  command: string;
  topic: HelpTopic;
  width: number;
}) {
  const content = topic.content || [];

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={BORDER_COLORS.focused}
      width={width}
      paddingLeft={1}
      paddingRight={1}
    >
      {/* Header */}
      <box height={1} borderBottom borderColor="gray">
        <text>
          <span fg="cyan" bold>
            {command}
          </span>
          <span fg="gray"> - {topic.description}</span>
        </text>
      </box>

      {/* Content */}
      <box flexDirection="column" paddingTop={1}>
        {content.slice(0, 15).map((line, idx) => (
          <box key={idx} height={1}>
            <text>
              <span fg={line.startsWith("  ") ? "green" : "white"}>
                {line}
              </span>
            </text>
          </box>
        ))}
        {content.length > 15 && (
          <box height={1}>
            <text>
              <span fg="gray">... ({content.length - 15} more lines)</span>
            </text>
          </box>
        )}
      </box>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * HelpCommandsScreen Component
 *
 * Displays all commands organized by category with navigation.
 *
 * @example
 * ```tsx
 * // Navigate to this screen via router
 * router.navigate("help", { screen: "commands" });
 * ```
 */
export function HelpCommandsScreen({ params }: HelpCommandsScreenProps) {
  const router = useRouter();
  const dimensions = useTerminalDimensions();

  // Get terminal dimensions
  const terminalWidth = dimensions.width || 80;
  const terminalHeight = dimensions.height || 24;

  // Extract command groups
  const categoryGroups = useMemo(() => extractCommands(HELP_TOPICS), []);
  const allCommands = useMemo(() => flattenCommands(categoryGroups), [categoryGroups]);

  // Selection state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Calculate layout
  const listWidth = Math.min(60, Math.floor(terminalWidth * 0.5));
  const detailWidth = terminalWidth - listWidth - 4;
  const visibleHeight = terminalHeight - 6;

  // Get current selection
  const selectedCommand = allCommands[selectedIndex];

  // Ensure selected index is visible
  const ensureVisible = useCallback(
    (index: number) => {
      if (index < scrollOffset) {
        setScrollOffset(index);
      } else if (index >= scrollOffset + visibleHeight) {
        setScrollOffset(index - visibleHeight + 1);
      }
    },
    [scrollOffset, visibleHeight]
  );

  // Navigation handlers
  const moveUp = useCallback(() => {
    setSelectedIndex((prev) => {
      const next = Math.max(0, prev - 1);
      ensureVisible(next);
      return next;
    });
  }, [ensureVisible]);

  const moveDown = useCallback(() => {
    setSelectedIndex((prev) => {
      const next = Math.min(allCommands.length - 1, prev + 1);
      ensureVisible(next);
      return next;
    });
  }, [allCommands.length, ensureVisible]);

  const moveToStart = useCallback(() => {
    setSelectedIndex(0);
    setScrollOffset(0);
  }, []);

  const moveToEnd = useCallback(() => {
    const lastIndex = allCommands.length - 1;
    setSelectedIndex(lastIndex);
    ensureVisible(lastIndex);
  }, [allCommands.length, ensureVisible]);

  // Keyboard handling
  useKeyboard(
    (key) => {
      if (key.name === "up" || (key.name === "k" && !key.ctrl)) {
        moveUp();
      } else if (key.name === "down" || (key.name === "j" && !key.ctrl)) {
        moveDown();
      } else if (key.name === "home") {
        moveToStart();
      } else if (key.name === "end") {
        moveToEnd();
      } else if (key.name === "pageup") {
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - visibleHeight);
          ensureVisible(next);
          return next;
        });
      } else if (key.name === "pagedown") {
        setSelectedIndex((prev) => {
          const next = Math.min(allCommands.length - 1, prev + visibleHeight);
          ensureVisible(next);
          return next;
        });
      } else if (key.name === "escape" || key.name === "q") {
        router.goBack();
      }
    },
    [moveUp, moveDown, moveToStart, moveToEnd, visibleHeight, allCommands.length, ensureVisible, router]
  );

  // Build visible command list with category headers
  const visibleItems: Array<{ type: "header" | "command"; data: any; globalIndex?: number }> = [];
  let globalIndex = 0;

  for (const group of categoryGroups) {
    visibleItems.push({ type: "header", data: group });
    for (const cmd of group.commands) {
      visibleItems.push({ type: "command", data: cmd, globalIndex });
      globalIndex++;
    }
  }

  // Calculate visible slice based on scroll
  const visibleSlice = visibleItems.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <box
        height={2}
        borderStyle="single"
        borderColor={BORDER_COLORS.focused}
        paddingLeft={1}
        paddingRight={1}
      >
        <text>
          <span fg="cyan" bold>
            {"\u2318"} Commands Reference
          </span>
          <span fg="gray">
            {" "}
            | {allCommands.length} commands | {"\u2191\u2193"} Navigate | Esc: Back
          </span>
        </text>
      </box>

      {/* Main content */}
      <box flexDirection="row" flexGrow={1}>
        {/* Command list */}
        <box
          width={listWidth}
          flexDirection="column"
          borderStyle="single"
          borderColor={BORDER_COLORS.default}
          paddingLeft={1}
        >
          {visibleSlice.map((item, idx) => {
            if (item.type === "header") {
              return (
                <CategoryHeader
                  key={`header-${item.data.category}`}
                  label={item.data.label}
                  icon={item.data.icon}
                />
              );
            }
            return (
              <CommandRow
                key={item.data.command}
                command={item.data.command}
                description={item.data.description}
                isSelected={item.globalIndex === selectedIndex}
                isFocused={true}
                width={listWidth - 2}
              />
            );
          })}
        </box>

        {/* Detail panel */}
        <box flexGrow={1}>
          {selectedCommand && (
            <CommandDetail
              command={selectedCommand.command}
              topic={selectedCommand.topic}
              width={detailWidth}
            />
          )}
        </box>
      </box>

      {/* Footer */}
      <box height={1} borderTop borderColor="gray" paddingLeft={1}>
        <text>
          <span fg="gray">
            {"\u2191\u2193"}/jk Navigate | Home/End First/Last | Esc Close
          </span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default HelpCommandsScreen;

/**
 * Register the help commands screen with the router.
 * Note: This is typically accessed as a sub-view of the help system,
 * not as a standalone screen.
 */
export function registerHelpCommandsScreen(): void {
  // This screen is accessed through help navigation, not directly registered
}
