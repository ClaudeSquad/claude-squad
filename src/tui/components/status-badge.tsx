/**
 * Status Badge Component
 *
 * A colored status indicator badge with icon support for displaying
 * agent, feature, workflow, and priority status states.
 */

import {
  type TerminalColor,
  TEXT_COLORS,
  getAgentStatusColor,
  getAgentStatusIcon,
  getFeatureStatusColor,
  getFeatureStatusIcon,
  getWorkflowStageColor,
  getWorkflowStageIcon,
  getPriorityColor,
  getPriorityIcon,
  getStatusColor,
  STATUS_ICONS,
  AGENT_STATUS_ICONS,
  FEATURE_STATUS_ICONS,
  WORKFLOW_STAGE_ICONS,
  PRIORITY_ICONS,
  type WorkflowStageStatus,
  type Priority,
  type StatusType,
} from "../theme/index.js";
import type { AgentStatus } from "../../core/entities/agent.js";
import type { FeatureStatus } from "../../core/entities/feature.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Status badge type determines which color/icon mapping to use.
 */
export type StatusBadgeType =
  | "agent"
  | "feature"
  | "workflow"
  | "priority"
  | "general";

/**
 * Display variant for the badge.
 */
export type StatusBadgeVariant = "solid" | "outline" | "subtle";

/**
 * Props for the StatusBadge component.
 */
export interface StatusBadgeProps {
  /** Status value to display (must match the type's status values) */
  status: string;
  /** Type of status to determine color/icon mapping (default: "general") */
  type?: StatusBadgeType;
  /** Visual variant (default: "outline") */
  variant?: StatusBadgeVariant;
  /** Show status icon prefix (default: true) */
  icon?: boolean;
  /** Override the displayed label text */
  label?: string;
  /** Custom icon character to override default */
  customIcon?: string;
  /** Custom color to override automatic selection */
  color?: TerminalColor;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get color for a status based on type.
 */
function getColorForStatus(status: string, type: StatusBadgeType): TerminalColor {
  switch (type) {
    case "agent":
      return getAgentStatusColor(status as AgentStatus);
    case "feature":
      return getFeatureStatusColor(status as FeatureStatus);
    case "workflow":
      return getWorkflowStageColor(status as WorkflowStageStatus);
    case "priority":
      return getPriorityColor(status as Priority);
    case "general":
    default:
      // Map common status strings to general status types
      if (status === "success" || status === "completed" || status === "done") {
        return getStatusColor("success");
      }
      if (status === "error" || status === "failed" || status === "blocked") {
        return getStatusColor("error");
      }
      if (status === "warning" || status === "waiting" || status === "pending") {
        return getStatusColor("warning");
      }
      return getStatusColor("info");
  }
}

/**
 * Get icon for a status based on type.
 */
function getIconForStatus(status: string, type: StatusBadgeType): string {
  switch (type) {
    case "agent":
      return getAgentStatusIcon(status as AgentStatus);
    case "feature":
      return getFeatureStatusIcon(status as FeatureStatus);
    case "workflow":
      return getWorkflowStageIcon(status as WorkflowStageStatus);
    case "priority":
      return getPriorityIcon(status as Priority);
    case "general":
    default:
      // Map common status strings to general icons
      if (status === "success" || status === "completed" || status === "done") {
        return STATUS_ICONS.success;
      }
      if (status === "error" || status === "failed" || status === "blocked") {
        return STATUS_ICONS.error;
      }
      if (status === "warning" || status === "waiting") {
        return STATUS_ICONS.warning;
      }
      if (status === "info" || status === "pending") {
        return STATUS_ICONS.info;
      }
      return STATUS_ICONS.bullet;
  }
}

/**
 * Format status text for display.
 */
function formatStatusText(status: string): string {
  // Convert snake_case or kebab-case to Title Case
  return status
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * StatusBadge Component
 *
 * Renders a colored status indicator with optional icon prefix.
 * Supports multiple status types (agent, feature, workflow, priority)
 * and visual variants (solid, outline, subtle).
 *
 * @example
 * ```tsx
 * // Agent status with icon
 * <StatusBadge status="working" type="agent" icon />
 *
 * // Feature status with solid variant
 * <StatusBadge status="in_progress" type="feature" variant="solid" />
 *
 * // Priority badge
 * <StatusBadge status="high" type="priority" />
 *
 * // Custom label override
 * <StatusBadge status="completed" type="general" label="Done!" />
 *
 * // Subtle variant (dimmed)
 * <StatusBadge status="idle" type="agent" variant="subtle" />
 * ```
 */
export function StatusBadge({
  status,
  type = "general",
  variant = "outline",
  icon = true,
  label,
  customIcon,
  color: customColor,
}: StatusBadgeProps) {
  // Get color and icon based on status type
  const statusColor = customColor ?? getColorForStatus(status, type);
  const statusIcon = customIcon ?? getIconForStatus(status, type);
  const displayText = label ?? formatStatusText(status);

  // Render based on variant
  switch (variant) {
    case "solid":
      // Colored background with inverted text
      return (
        <box flexDirection="row" gap={0}>
          <text>
            <span bg={statusColor} fg={TEXT_COLORS.inverted}>
              {icon ? ` ${statusIcon} ${displayText} ` : ` ${displayText} `}
            </span>
          </text>
        </box>
      );

    case "subtle":
      // Dimmed text with subtle icon
      return (
        <box flexDirection="row" gap={0}>
          <text>
            {icon && <span fg="gray">{statusIcon} </span>}
            <span fg="gray">{displayText.toLowerCase()}</span>
          </text>
        </box>
      );

    case "outline":
    default:
      // Colored text with colored icon
      return (
        <box flexDirection="row" gap={0}>
          <text>
            {icon && <span fg={statusColor}>{statusIcon} </span>}
            <span fg={statusColor}>{displayText}</span>
          </text>
        </box>
      );
  }
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Pre-configured badge for agent status.
 */
export interface AgentStatusBadgeProps extends Omit<StatusBadgeProps, "type" | "status"> {
  status: AgentStatus;
}

export function AgentStatusBadge({ status, ...props }: AgentStatusBadgeProps) {
  return <StatusBadge status={status} type="agent" {...props} />;
}

/**
 * Pre-configured badge for feature status.
 */
export interface FeatureStatusBadgeProps extends Omit<StatusBadgeProps, "type" | "status"> {
  status: FeatureStatus;
}

export function FeatureStatusBadge({ status, ...props }: FeatureStatusBadgeProps) {
  return <StatusBadge status={status} type="feature" {...props} />;
}

/**
 * Pre-configured badge for workflow stage status.
 */
export interface WorkflowStatusBadgeProps extends Omit<StatusBadgeProps, "type" | "status"> {
  status: WorkflowStageStatus;
}

export function WorkflowStatusBadge({ status, ...props }: WorkflowStatusBadgeProps) {
  return <StatusBadge status={status} type="workflow" {...props} />;
}

/**
 * Pre-configured badge for priority level.
 */
export interface PriorityBadgeProps extends Omit<StatusBadgeProps, "type" | "status"> {
  priority: Priority;
}

export function PriorityBadge({ priority, ...props }: PriorityBadgeProps) {
  return <StatusBadge status={priority} type="priority" {...props} />;
}

// ============================================================================
// Exports
// ============================================================================

export default StatusBadge;
