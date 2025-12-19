/**
 * Theme Colors
 *
 * Centralized color palette for the Claude Squad TUI.
 * Uses terminal-compatible colors (basic 16 colors and their bright variants).
 */

// ============================================================================
// Terminal Color Types
// ============================================================================

/**
 * Standard terminal colors (foreground/background compatible).
 * These work across all terminal emulators.
 */
export type TerminalColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"
  | "grey";

/**
 * Bright/bold terminal color variants.
 */
export type BrightTerminalColor =
  | "brightBlack"
  | "brightRed"
  | "brightGreen"
  | "brightYellow"
  | "brightBlue"
  | "brightMagenta"
  | "brightCyan"
  | "brightWhite";

/**
 * All supported terminal colors.
 */
export type Color = TerminalColor | BrightTerminalColor;

// ============================================================================
// Primary Colors
// ============================================================================

/**
 * Primary semantic colors for consistent UI meaning.
 */
export const PRIMARY_COLORS = {
  /** Success actions, positive states, confirmations */
  success: "green" as const,
  /** Informational content, links, interactive elements */
  info: "cyan" as const,
  /** Warnings, caution states, pending actions */
  warning: "yellow" as const,
  /** Errors, destructive actions, critical alerts */
  error: "red" as const,
  /** Primary brand/accent color */
  primary: "blue" as const,
  /** Secondary/muted accent */
  secondary: "magenta" as const,
} as const;

export type PrimaryColorKey = keyof typeof PRIMARY_COLORS;

// ============================================================================
// Text Colors
// ============================================================================

/**
 * Text color palette for typography hierarchy.
 */
export const TEXT_COLORS = {
  /** Primary text - high contrast, most readable */
  primary: "white" as const,
  /** Secondary text - slightly muted for less emphasis */
  secondary: "gray" as const,
  /** Disabled/inactive text */
  disabled: "gray" as const,
  /** Dimmed text for metadata, hints, timestamps */
  dimmed: "gray" as const,
  /** Inverted text for dark backgrounds */
  inverted: "black" as const,
  /** Highlighted/emphasized text */
  highlight: "cyan" as const,
  /** Code/monospace text */
  code: "yellow" as const,
} as const;

export type TextColorKey = keyof typeof TEXT_COLORS;

// ============================================================================
// Background Colors
// ============================================================================

/**
 * Background colors for UI elements.
 */
export const BACKGROUND_COLORS = {
  /** Default/transparent background */
  default: undefined,
  /** Selection highlight */
  selection: "blue" as const,
  /** Hover state */
  hover: "gray" as const,
  /** Active/pressed state */
  active: "cyan" as const,
  /** Header bar background */
  header: "blue" as const,
  /** Footer bar background */
  footer: "gray" as const,
  /** Modal/overlay background */
  overlay: "black" as const,
  /** Success indicator background */
  success: "green" as const,
  /** Error indicator background */
  error: "red" as const,
  /** Warning indicator background */
  warning: "yellow" as const,
} as const;

export type BackgroundColorKey = keyof typeof BACKGROUND_COLORS;

// ============================================================================
// Border Colors
// ============================================================================

/**
 * Border colors for boxes and panels.
 */
export const BORDER_COLORS = {
  /** Default/unfocused border */
  default: "gray" as const,
  /** Focused/active element border */
  focused: "cyan" as const,
  /** Success state border */
  success: "green" as const,
  /** Error state border */
  error: "red" as const,
  /** Warning state border */
  warning: "yellow" as const,
  /** Muted/subtle border */
  muted: "gray" as const,
  /** Primary accent border */
  primary: "blue" as const,
} as const;

export type BorderColorKey = keyof typeof BORDER_COLORS;

// ============================================================================
// Box Drawing Characters
// ============================================================================

/**
 * ASCII box-drawing character sets for terminal borders.
 * Compatible with OpenTUI borderStyle prop.
 */
export const BOX_DRAWING = {
  /** Single line border (Unicode) */
  single: {
    topLeft: "\u250C", // ┌
    topRight: "\u2510", // ┐
    bottomLeft: "\u2514", // └
    bottomRight: "\u2518", // ┘
    horizontal: "\u2500", // ─
    vertical: "\u2502", // │
    cross: "\u253C", // ┼
    teeDown: "\u252C", // ┬
    teeUp: "\u2534", // ┴
    teeRight: "\u251C", // ├
    teeLeft: "\u2524", // ┤
  },
  /** Double line border (Unicode) */
  double: {
    topLeft: "\u2554", // ╔
    topRight: "\u2557", // ╗
    bottomLeft: "\u255A", // ╚
    bottomRight: "\u255D", // ╝
    horizontal: "\u2550", // ═
    vertical: "\u2551", // ║
    cross: "\u256C", // ╬
    teeDown: "\u2566", // ╦
    teeUp: "\u2569", // ╩
    teeRight: "\u2560", // ╠
    teeLeft: "\u2563", // ╣
  },
  /** Rounded corner border (Unicode) */
  rounded: {
    topLeft: "\u256D", // ╭
    topRight: "\u256E", // ╮
    bottomLeft: "\u2570", // ╰
    bottomRight: "\u256F", // ╯
    horizontal: "\u2500", // ─
    vertical: "\u2502", // │
    cross: "\u253C", // ┼
    teeDown: "\u252C", // ┬
    teeUp: "\u2534", // ┴
    teeRight: "\u251C", // ├
    teeLeft: "\u2524", // ┤
  },
  /** Bold/thick border (Unicode) */
  bold: {
    topLeft: "\u250F", // ┏
    topRight: "\u2513", // ┓
    bottomLeft: "\u2517", // ┗
    bottomRight: "\u251B", // ┛
    horizontal: "\u2501", // ━
    vertical: "\u2503", // ┃
    cross: "\u254B", // ╋
    teeDown: "\u2533", // ┳
    teeUp: "\u253B", // ┻
    teeRight: "\u2523", // ┣
    teeLeft: "\u252B", // ┫
  },
  /** ASCII fallback (for terminals without Unicode support) */
  ascii: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
    cross: "+",
    teeDown: "+",
    teeUp: "+",
    teeRight: "+",
    teeLeft: "+",
  },
} as const;

export type BoxDrawingStyle = keyof typeof BOX_DRAWING;
export type BoxDrawingCharacters = (typeof BOX_DRAWING)[BoxDrawingStyle];

// ============================================================================
// Progress Bar Characters
// ============================================================================

/**
 * Characters for progress bar rendering.
 */
export const PROGRESS_CHARS = {
  /** Filled portion of progress bar */
  filled: "\u2588", // █
  /** Empty/remaining portion of progress bar */
  empty: "\u2591", // ░
  /** Half-filled character for smoother progress */
  half: "\u2592", // ▒
  /** Progress bar left bracket */
  leftBracket: "[",
  /** Progress bar right bracket */
  rightBracket: "]",
} as const;

// ============================================================================
// Status Indicator Characters
// ============================================================================

/**
 * Unicode characters for status indicators and icons.
 */
export const STATUS_ICONS = {
  /** Success/check mark */
  success: "\u2714", // ✔
  /** Error/cross mark */
  error: "\u2718", // ✘
  /** Warning/exclamation */
  warning: "\u26A0", // ⚠
  /** Info/information */
  info: "\u2139", // ℹ
  /** Loading/spinner frames */
  spinner: ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"],
  /** Bullet point */
  bullet: "\u2022", // •
  /** Arrow right */
  arrowRight: "\u2192", // →
  /** Arrow left */
  arrowLeft: "\u2190", // ←
  /** Arrow up */
  arrowUp: "\u2191", // ↑
  /** Arrow down */
  arrowDown: "\u2193", // ↓
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a primary color by semantic key.
 */
export function getPrimaryColor(key: PrimaryColorKey): TerminalColor {
  return PRIMARY_COLORS[key];
}

/**
 * Get a text color by key.
 */
export function getTextColor(key: TextColorKey): TerminalColor {
  return TEXT_COLORS[key];
}

/**
 * Get a background color by key.
 */
export function getBackgroundColor(key: BackgroundColorKey): TerminalColor | undefined {
  return BACKGROUND_COLORS[key];
}

/**
 * Get a border color by key.
 */
export function getBorderColor(key: BorderColorKey): TerminalColor {
  return BORDER_COLORS[key];
}

/**
 * Get box drawing characters by style.
 */
export function getBoxDrawing(style: BoxDrawingStyle): BoxDrawingCharacters {
  return BOX_DRAWING[style];
}
