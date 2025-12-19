/**
 * Status Colors
 *
 * Color mappings for various status types in the Claude Squad TUI.
 * Provides consistent visual feedback for agent states, workflow stages,
 * priorities, and progress indicators.
 */

import type { TerminalColor } from "./colors.js";
import type { AgentStatus } from "../../core/entities/agent.js";
import type { FeatureStatus } from "../../core/entities/feature.js";

// ============================================================================
// General Status Colors
// ============================================================================

/**
 * General status types used across the application.
 */
export type StatusType = "info" | "success" | "warning" | "error";

/**
 * Color mapping for general status types.
 * Used in footer, notifications, and alerts.
 */
export const STATUS_COLORS: Record<StatusType, TerminalColor> = {
  info: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
} as const;

// ============================================================================
// Agent Status Colors
// ============================================================================

/**
 * Color mapping for agent lifecycle states.
 *
 * - idle: Gray - agent is ready but not working
 * - working: Green - agent is actively processing
 * - waiting: Yellow - agent needs user input
 * - paused: Blue - agent is manually paused
 * - error: Red - agent encountered an error
 * - completed: Cyan - agent finished successfully
 */
export const AGENT_STATUS_COLORS: Record<AgentStatus, TerminalColor> = {
  idle: "gray",
  working: "green",
  waiting: "yellow",
  paused: "blue",
  error: "red",
  completed: "cyan",
} as const;

/**
 * Background colors for agent status badges.
 * Used for more prominent status indicators.
 */
export const AGENT_STATUS_BG_COLORS: Record<AgentStatus, TerminalColor> = {
  idle: "gray",
  working: "green",
  waiting: "yellow",
  paused: "blue",
  error: "red",
  completed: "cyan",
} as const;

/**
 * Status icons/symbols for agent states.
 */
export const AGENT_STATUS_ICONS: Record<AgentStatus, string> = {
  idle: "\u25CB", // ○ (empty circle)
  working: "\u25CF", // ● (filled circle)
  waiting: "\u25D4", // ◔ (circle with upper right quadrant)
  paused: "\u25A0", // ■ (square)
  error: "\u2718", // ✘ (cross)
  completed: "\u2714", // ✔ (checkmark)
} as const;

// ============================================================================
// Feature Status Colors
// ============================================================================

/**
 * Color mapping for feature lifecycle states.
 *
 * - planning: Blue - feature is being designed
 * - in_progress: Green - feature is actively being developed
 * - review: Yellow - feature is under review
 * - testing: Magenta - feature is being tested
 * - completed: Cyan - feature is done
 * - blocked: Red - feature is blocked
 * - cancelled: Gray - feature was cancelled
 */
export const FEATURE_STATUS_COLORS: Record<FeatureStatus, TerminalColor> = {
  planning: "blue",
  in_progress: "green",
  review: "yellow",
  testing: "magenta",
  completed: "cyan",
  blocked: "red",
  cancelled: "gray",
} as const;

/**
 * Status icons for feature states.
 */
export const FEATURE_STATUS_ICONS: Record<FeatureStatus, string> = {
  planning: "\u270E", // ✎ (pencil)
  in_progress: "\u25B6", // ▶ (play)
  review: "\u2687", // ⚇ (eyes)
  testing: "\u2691", // ⚑ (flag)
  completed: "\u2714", // ✔ (checkmark)
  blocked: "\u26D4", // ⛔ (stop)
  cancelled: "\u2718", // ✘ (cross)
} as const;

// ============================================================================
// Workflow Stage Colors
// ============================================================================

/**
 * Workflow stage status types.
 */
export type WorkflowStageStatus =
  | "pending"
  | "running"
  | "review"
  | "completed"
  | "failed"
  | "skipped";

/**
 * Color mapping for workflow stage states.
 */
export const WORKFLOW_STAGE_COLORS: Record<WorkflowStageStatus, TerminalColor> = {
  pending: "gray",
  running: "green",
  review: "yellow",
  completed: "cyan",
  failed: "red",
  skipped: "gray",
} as const;

/**
 * Stage status icons.
 */
export const WORKFLOW_STAGE_ICONS: Record<WorkflowStageStatus, string> = {
  pending: "\u25CB", // ○ (empty circle)
  running: "\u25CF", // ● (filled circle)
  review: "\u25D4", // ◔ (partially filled)
  completed: "\u2714", // ✔ (checkmark)
  failed: "\u2718", // ✘ (cross)
  skipped: "\u2015", // ― (horizontal bar)
} as const;

// ============================================================================
// Priority Colors
// ============================================================================

/**
 * Priority levels.
 */
export type Priority = "urgent" | "high" | "normal" | "low";

/**
 * Color mapping for priority levels.
 *
 * - urgent: Red - requires immediate attention
 * - high: Yellow - important, should be addressed soon
 * - normal: White - standard priority
 * - low: Gray - can be deferred
 */
export const PRIORITY_COLORS: Record<Priority, TerminalColor> = {
  urgent: "red",
  high: "yellow",
  normal: "white",
  low: "gray",
} as const;

/**
 * Priority icons/symbols.
 */
export const PRIORITY_ICONS: Record<Priority, string> = {
  urgent: "\u2757", // ❗ (exclamation)
  high: "\u2191", // ↑ (up arrow)
  normal: "\u2500", // ─ (dash)
  low: "\u2193", // ↓ (down arrow)
} as const;

// ============================================================================
// Progress Indicator Colors
// ============================================================================

/**
 * Colors for progress bar segments based on completion percentage.
 */
export const PROGRESS_COLORS = {
  /** 0-25% completion */
  low: "red" as TerminalColor,
  /** 25-50% completion */
  medium: "yellow" as TerminalColor,
  /** 50-75% completion */
  high: "cyan" as TerminalColor,
  /** 75-100% completion */
  complete: "green" as TerminalColor,
  /** Background/remaining portion */
  background: "gray" as TerminalColor,
} as const;

/**
 * Get progress color based on percentage value.
 */
export function getProgressColor(percentage: number): TerminalColor {
  if (percentage >= 75) return PROGRESS_COLORS.complete;
  if (percentage >= 50) return PROGRESS_COLORS.high;
  if (percentage >= 25) return PROGRESS_COLORS.medium;
  return PROGRESS_COLORS.low;
}

// ============================================================================
// Review Gate Colors
// ============================================================================

/**
 * Review gate types.
 */
export type ReviewGateType = "human" | "automated" | "none";

/**
 * Color mapping for review gate types.
 */
export const REVIEW_GATE_COLORS: Record<ReviewGateType, TerminalColor> = {
  human: "yellow",
  automated: "cyan",
  none: "gray",
} as const;

/**
 * Icons for review gate types.
 */
export const REVIEW_GATE_ICONS: Record<ReviewGateType, string> = {
  human: "\u263A", // ☺ (smiley)
  automated: "\u2699", // ⚙ (gear)
  none: "\u2015", // ― (dash)
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color for a general status type.
 */
export function getStatusColor(status: StatusType): TerminalColor {
  return STATUS_COLORS[status];
}

/**
 * Get color for an agent status.
 */
export function getAgentStatusColor(status: AgentStatus): TerminalColor {
  return AGENT_STATUS_COLORS[status];
}

/**
 * Get icon for an agent status.
 */
export function getAgentStatusIcon(status: AgentStatus): string {
  return AGENT_STATUS_ICONS[status];
}

/**
 * Get color for a feature status.
 */
export function getFeatureStatusColor(status: FeatureStatus): TerminalColor {
  return FEATURE_STATUS_COLORS[status];
}

/**
 * Get icon for a feature status.
 */
export function getFeatureStatusIcon(status: FeatureStatus): string {
  return FEATURE_STATUS_ICONS[status];
}

/**
 * Get color for a workflow stage status.
 */
export function getWorkflowStageColor(status: WorkflowStageStatus): TerminalColor {
  return WORKFLOW_STAGE_COLORS[status];
}

/**
 * Get icon for a workflow stage status.
 */
export function getWorkflowStageIcon(status: WorkflowStageStatus): string {
  return WORKFLOW_STAGE_ICONS[status];
}

/**
 * Get color for a priority level.
 */
export function getPriorityColor(priority: Priority): TerminalColor {
  return PRIORITY_COLORS[priority];
}

/**
 * Get icon for a priority level.
 */
export function getPriorityIcon(priority: Priority): string {
  return PRIORITY_ICONS[priority];
}

/**
 * Get color for a review gate type.
 */
export function getReviewGateColor(gate: ReviewGateType): TerminalColor {
  return REVIEW_GATE_COLORS[gate];
}

/**
 * Get icon for a review gate type.
 */
export function getReviewGateIcon(gate: ReviewGateType): string {
  return REVIEW_GATE_ICONS[gate];
}
