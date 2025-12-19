/**
 * TUI Theme System
 *
 * Centralized theme configuration for the Claude Squad terminal UI.
 * Provides consistent colors, status mappings, and visual elements
 * across all TUI components.
 *
 * @example
 * ```tsx
 * import { getAgentStatusColor, PRIMARY_COLORS, BOX_DRAWING } from '../theme';
 *
 * function AgentPanel({ status }: { status: AgentStatus }) {
 *   return (
 *     <box borderColor={getAgentStatusColor(status)}>
 *       <text color={PRIMARY_COLORS.info}>Agent Status: {status}</text>
 *     </box>
 *   );
 * }
 * ```
 */

// ============================================================================
// Re-export Color Palette
// ============================================================================

export {
  // Types
  type TerminalColor,
  type BrightTerminalColor,
  type Color,
  type PrimaryColorKey,
  type TextColorKey,
  type BackgroundColorKey,
  type BorderColorKey,
  type BoxDrawingStyle,
  type BoxDrawingCharacters,
  // Color Constants
  PRIMARY_COLORS,
  TEXT_COLORS,
  BACKGROUND_COLORS,
  BORDER_COLORS,
  // Box Drawing & Progress
  BOX_DRAWING,
  PROGRESS_CHARS,
  STATUS_ICONS,
  // Helper Functions
  getPrimaryColor,
  getTextColor,
  getBackgroundColor,
  getBorderColor,
  getBoxDrawing,
} from "./colors.js";

// ============================================================================
// Re-export Status Colors
// ============================================================================

export {
  // Types
  type StatusType,
  type WorkflowStageStatus,
  type Priority,
  type ReviewGateType,
  // Status Color Mappings
  STATUS_COLORS,
  AGENT_STATUS_COLORS,
  AGENT_STATUS_BG_COLORS,
  AGENT_STATUS_ICONS,
  FEATURE_STATUS_COLORS,
  FEATURE_STATUS_ICONS,
  WORKFLOW_STAGE_COLORS,
  WORKFLOW_STAGE_ICONS,
  PRIORITY_COLORS,
  PRIORITY_ICONS,
  PROGRESS_COLORS,
  REVIEW_GATE_COLORS,
  REVIEW_GATE_ICONS,
  // Helper Functions
  getStatusColor,
  getAgentStatusColor,
  getAgentStatusIcon,
  getFeatureStatusColor,
  getFeatureStatusIcon,
  getWorkflowStageColor,
  getWorkflowStageIcon,
  getPriorityColor,
  getPriorityIcon,
  getProgressColor,
  getReviewGateColor,
  getReviewGateIcon,
} from "./status.js";

// ============================================================================
// Theme Configuration
// ============================================================================

/**
 * Theme configuration options.
 */
export interface ThemeConfig {
  /** Use Unicode box drawing characters (default: true) */
  useUnicode: boolean;
  /** Use bright/bold colors for emphasis (default: true) */
  useBrightColors: boolean;
  /** Show status icons alongside text (default: true) */
  showStatusIcons: boolean;
}

/**
 * Default theme configuration.
 */
export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  useUnicode: true,
  useBrightColors: true,
  showStatusIcons: true,
};

/**
 * ASCII-safe theme configuration for limited terminal support.
 */
export const ASCII_THEME_CONFIG: ThemeConfig = {
  useUnicode: false,
  useBrightColors: false,
  showStatusIcons: false,
};

// ============================================================================
// Theme Utilities
// ============================================================================

import { BOX_DRAWING } from "./colors.js";

/**
 * Get the appropriate box drawing characters based on theme config.
 */
export function getBoxChars(config: ThemeConfig = DEFAULT_THEME_CONFIG) {
  return config.useUnicode ? BOX_DRAWING.single : BOX_DRAWING.ascii;
}

/**
 * Get a focused box style for the theme.
 */
export function getFocusedBoxChars(config: ThemeConfig = DEFAULT_THEME_CONFIG) {
  return config.useUnicode ? BOX_DRAWING.double : BOX_DRAWING.ascii;
}
