/**
 * Help Content Component
 *
 * A scrollable content viewer for displaying help topic content.
 * Supports keyboard navigation, text formatting, and wrapping.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import { BORDER_COLORS, TEXT_COLORS } from "../../theme/index.js";
import type { HelpTopic } from "./help-data.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for HelpContent component.
 */
export interface HelpContentProps {
  /** The topic to display */
  topic: HelpTopic | null;
  /** Whether this component is focused */
  focused?: boolean;
  /** Maximum height in lines */
  maxHeight?: number;
  /** Width of the content panel */
  width?: number;
  /** Callback when user wants to go back */
  onBack?: () => void;
}

/**
 * Formatted line with styling information.
 */
interface FormattedLine {
  /** The text content */
  text: string;
  /** Whether this is a heading */
  isHeading: boolean;
  /** Heading level (1=H1, 2=H2, etc.) */
  headingLevel: number;
  /** Whether this is a code block line */
  isCode: boolean;
  /** Whether this is a list item */
  isList: boolean;
  /** Indent level for list items */
  indentLevel: number;
  /** Whether this is an empty line */
  isEmpty: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SCROLL_STEP = 1;
const PAGE_SCROLL_FACTOR = 0.8;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect if a line is a heading.
 */
function detectHeading(line: string): { isHeading: boolean; level: number; text: string } {
  // Markdown-style headings: # H1, ## H2, etc.
  const markdownMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (markdownMatch) {
    return {
      isHeading: true,
      level: markdownMatch[1]!.length,
      text: markdownMatch[2]!,
    };
  }

  // Underline-style headings: === for H1, --- for H2
  // This would need to look at the next line, so we handle it differently
  return { isHeading: false, level: 0, text: line };
}

/**
 * Check if a line is an underline for previous heading.
 */
function isUnderline(line: string): { isUnderline: boolean; level: number } {
  if (/^={3,}$/.test(line.trim())) {
    return { isUnderline: true, level: 1 };
  }
  if (/^-{3,}$/.test(line.trim())) {
    return { isUnderline: true, level: 2 };
  }
  return { isUnderline: false, level: 0 };
}

/**
 * Parse content lines into formatted lines with styling.
 */
function parseContent(lines: string[]): FormattedLine[] {
  const result: FormattedLine[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    const nextLine = lines[i + 1] || "";

    // Check if next line is an underline (makes this line a heading)
    const underline = isUnderline(nextLine);
    if (underline.isUnderline && line.trim().length > 0) {
      result.push({
        text: line,
        isHeading: true,
        headingLevel: underline.level,
        isCode: false,
        isList: false,
        indentLevel: 0,
        isEmpty: false,
      });
      // Skip the underline itself
      i++;
      continue;
    }

    // Check for markdown headings
    const heading = detectHeading(line);
    if (heading.isHeading) {
      result.push({
        text: heading.text,
        isHeading: true,
        headingLevel: heading.level,
        isCode: false,
        isList: false,
        indentLevel: 0,
        isEmpty: false,
      });
      continue;
    }

    // Check for list items
    const listMatch = line.match(/^(\s*)([*\-+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1]?.length || 0;
      result.push({
        text: listMatch[3] || "",
        isHeading: false,
        headingLevel: 0,
        isCode: false,
        isList: true,
        indentLevel: Math.floor(indent / 2) + 1,
        isEmpty: false,
      });
      continue;
    }

    // Check for code-like lines (indented with 4+ spaces or starting with specific patterns)
    const isCodeLine =
      /^\s{4,}/.test(line) ||
      /^```/.test(line.trim()) ||
      /^\/\w+/.test(line.trim()); // Commands like /help

    // Empty line
    if (line.trim() === "") {
      result.push({
        text: "",
        isHeading: false,
        headingLevel: 0,
        isCode: false,
        isList: false,
        indentLevel: 0,
        isEmpty: true,
      });
      continue;
    }

    // Regular or code line
    result.push({
      text: line,
      isHeading: false,
      headingLevel: 0,
      isCode: isCodeLine,
      isList: false,
      indentLevel: 0,
      isEmpty: false,
    });
  }

  return result;
}

/**
 * Wrap text to fit within width.
 */
function wrapText(text: string, width: number): string[] {
  if (text.length <= width) {
    return [text];
  }

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= width) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

// ============================================================================
// Content Line Component
// ============================================================================

interface ContentLineProps {
  line: FormattedLine;
  width: number;
}

function ContentLine({ line, width }: ContentLineProps) {
  if (line.isEmpty) {
    return <box height={1} />;
  }

  // Heading styling
  if (line.isHeading) {
    const color = line.headingLevel === 1 ? "cyan" : line.headingLevel === 2 ? "yellow" : "white";
    const bold = line.headingLevel <= 2;

    return (
      <box height={1}>
        <text>
          <span fg={color} bold={bold}>
            {line.text}
          </span>
        </text>
      </box>
    );
  }

  // List item styling
  if (line.isList) {
    const indent = "  ".repeat(line.indentLevel);
    const bullet = "\u2022"; // Bullet point

    return (
      <box height={1}>
        <text>
          <span fg="gray">{indent}{bullet} </span>
          <span fg="white">{line.text}</span>
        </text>
      </box>
    );
  }

  // Code styling
  if (line.isCode) {
    return (
      <box height={1}>
        <text>
          <span fg="green">{line.text}</span>
        </text>
      </box>
    );
  }

  // Regular text
  return (
    <box height={1}>
      <text>
        <span fg="white">{line.text}</span>
      </text>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * HelpContent Component
 *
 * Renders scrollable help content with formatting support.
 * Supports headings, lists, code blocks, and text wrapping.
 *
 * @example
 * ```tsx
 * <HelpContent
 *   topic={selectedTopic}
 *   focused={!isTreeFocused}
 *   width={50}
 *   maxHeight={20}
 *   onBack={() => setSelectedTopic(null)}
 * />
 * ```
 */
export function HelpContent({
  topic,
  focused = false,
  maxHeight = 20,
  width = 50,
  onBack,
}: HelpContentProps) {
  // Scroll position
  const [scrollOffset, setScrollOffset] = useState(0);

  // Parse content into formatted lines
  const formattedLines = useMemo(() => {
    if (!topic?.content) {
      return [];
    }
    return parseContent(topic.content);
  }, [topic?.content]);

  // Calculate visible height (account for borders and header)
  const visibleHeight = maxHeight - 4;

  // Reset scroll when topic changes
  useEffect(() => {
    setScrollOffset(0);
  }, [topic?.id]);

  // Handle scrolling
  const scrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - SCROLL_STEP));
  }, []);

  const scrollDown = useCallback(() => {
    const maxScroll = Math.max(0, formattedLines.length - visibleHeight);
    setScrollOffset((prev) => Math.min(maxScroll, prev + SCROLL_STEP));
  }, [formattedLines.length, visibleHeight]);

  const scrollPageUp = useCallback(() => {
    const pageSize = Math.floor(visibleHeight * PAGE_SCROLL_FACTOR);
    setScrollOffset((prev) => Math.max(0, prev - pageSize));
  }, [visibleHeight]);

  const scrollPageDown = useCallback(() => {
    const pageSize = Math.floor(visibleHeight * PAGE_SCROLL_FACTOR);
    const maxScroll = Math.max(0, formattedLines.length - visibleHeight);
    setScrollOffset((prev) => Math.min(maxScroll, prev + pageSize));
  }, [formattedLines.length, visibleHeight]);

  const scrollToTop = useCallback(() => {
    setScrollOffset(0);
  }, []);

  const scrollToBottom = useCallback(() => {
    const maxScroll = Math.max(0, formattedLines.length - visibleHeight);
    setScrollOffset(maxScroll);
  }, [formattedLines.length, visibleHeight]);

  // Handle keyboard input
  useKeyboard(
    (key) => {
      if (!focused) return;

      if (key.name === "up" || (key.name === "k" && !key.ctrl)) {
        scrollUp();
      } else if (key.name === "down" || (key.name === "j" && !key.ctrl)) {
        scrollDown();
      } else if (key.name === "pageup") {
        scrollPageUp();
      } else if (key.name === "pagedown") {
        scrollPageDown();
      } else if (key.name === "home" || (key.name === "g" && !key.ctrl && !key.shift)) {
        scrollToTop();
      } else if (key.name === "end" || (key.name === "g" && key.shift)) {
        scrollToBottom();
      } else if (key.name === "escape" && onBack) {
        onBack();
      }
    },
    [focused, scrollUp, scrollDown, scrollPageUp, scrollPageDown, scrollToTop, scrollToBottom, onBack]
  );

  // Get visible lines
  const visibleLines = formattedLines.slice(scrollOffset, scrollOffset + visibleHeight);

  // Calculate scroll indicators
  const showScrollUp = scrollOffset > 0;
  const showScrollDown = scrollOffset + visibleHeight < formattedLines.length;
  const scrollPercent =
    formattedLines.length <= visibleHeight
      ? 100
      : Math.round((scrollOffset / (formattedLines.length - visibleHeight)) * 100);

  // Content width inside box
  const contentWidth = width - 4;

  // Render empty state if no topic
  if (!topic) {
    return (
      <box
        flexDirection="column"
        width={width}
        height={maxHeight}
        borderStyle="single"
        borderColor={focused ? BORDER_COLORS.focused : BORDER_COLORS.default}
      >
        <box
          flexGrow={1}
          justifyContent="center"
          alignItems="center"
          flexDirection="column"
        >
          <text>
            <span fg="gray">Select a topic from the tree</span>
          </text>
          <text>
            <span fg="gray">{"\u2190"} Use arrow keys to navigate</span>
          </text>
        </box>
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      width={width}
      borderStyle="single"
      borderColor={focused ? BORDER_COLORS.focused : BORDER_COLORS.default}
    >
      {/* Header with topic info */}
      <box
        height={1}
        paddingLeft={1}
        paddingRight={1}
        borderBottom
        borderColor="gray"
      >
        <text>
          <span fg="cyan" bold>
            {topic.icon ? `${topic.icon} ` : ""}
            {topic.label}
          </span>
        </text>
      </box>

      {/* Scroll up indicator */}
      {showScrollUp && (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg="gray">{"\u25B2"} scroll up ({scrollPercent}%)</span>
          </text>
        </box>
      )}

      {/* Content area */}
      <box flexDirection="column" paddingLeft={1} paddingRight={1}>
        {visibleLines.length > 0 ? (
          visibleLines.map((line, idx) => (
            <ContentLine key={scrollOffset + idx} line={line} width={contentWidth} />
          ))
        ) : topic.description ? (
          <box height={1}>
            <text>
              <span fg="white">{topic.description}</span>
            </text>
          </box>
        ) : (
          <box height={1}>
            <text>
              <span fg="gray">No content available for this topic.</span>
            </text>
          </box>
        )}
      </box>

      {/* Scroll down indicator */}
      {showScrollDown && (
        <box height={1} paddingLeft={1}>
          <text>
            <span fg="gray">{"\u25BC"} scroll down ({scrollPercent}%)</span>
          </text>
        </box>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default HelpContent;
