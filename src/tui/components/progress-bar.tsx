/**
 * Progress Bar Component
 *
 * A horizontal progress bar with percentage display, optional label,
 * animated spinner for indeterminate progress, and theme-based coloring.
 */

import { useState, useEffect, useRef } from "react";
import {
  PROGRESS_CHARS,
  STATUS_ICONS,
  getProgressColor,
  type TerminalColor,
} from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the ProgressBar component.
 */
export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Character width of the bar (default: 20) */
  width?: number;
  /** Optional label displayed before the bar */
  label?: string;
  /** Show percentage text after the bar (default: false) */
  showPercentage?: boolean;
  /** Show indeterminate spinner for unknown progress */
  indeterminate?: boolean;
  /** Override automatic progress-based color */
  color?: TerminalColor;
  /** Show completion checkmark when progress is 100% (default: true) */
  showCompletionMark?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clamp a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Build the progress bar string.
 */
function buildProgressBar(
  progress: number,
  width: number
): { filled: string; empty: string } {
  const clampedProgress = clamp(progress, 0, 100);
  const filledWidth = Math.round((clampedProgress / 100) * width);
  const emptyWidth = width - filledWidth;

  return {
    filled: PROGRESS_CHARS.filled.repeat(filledWidth),
    empty: PROGRESS_CHARS.empty.repeat(emptyWidth),
  };
}

// ============================================================================
// Spinner Hook
// ============================================================================

/**
 * Hook for animated spinner frames.
 */
function useSpinner(active: boolean, intervalMs: number = 80): string {
  const [frameIndex, setFrameIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (active) {
      intervalRef.current = setInterval(() => {
        setFrameIndex((prev) => (prev + 1) % STATUS_ICONS.spinner.length);
      }, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setFrameIndex(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [active, intervalMs]);

  return STATUS_ICONS.spinner[frameIndex];
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ProgressBar Component
 *
 * Renders a horizontal progress bar with optional features:
 * - Label text before the bar
 * - Percentage display after the bar
 * - Automatic color based on progress percentage
 * - Animated spinner for indeterminate states
 * - Completion checkmark at 100%
 *
 * @example
 * ```tsx
 * // Basic progress bar
 * <ProgressBar progress={40} />
 *
 * // With label and percentage
 * <ProgressBar
 *   progress={75}
 *   label="Building..."
 *   showPercentage
 * />
 *
 * // Indeterminate spinner
 * <ProgressBar
 *   indeterminate
 *   label="Loading..."
 *   progress={0}
 * />
 *
 * // Custom width and color
 * <ProgressBar
 *   progress={50}
 *   width={30}
 *   color="magenta"
 *   showPercentage
 * />
 * ```
 */
export function ProgressBar({
  progress,
  width = 20,
  label,
  showPercentage = false,
  indeterminate = false,
  color,
  showCompletionMark = true,
}: ProgressBarProps) {
  const spinnerFrame = useSpinner(indeterminate);
  const clampedProgress = clamp(progress, 0, 100);
  const isComplete = clampedProgress >= 100 && !indeterminate;

  // Determine the color to use
  const barColor = color ?? getProgressColor(clampedProgress);

  // Render indeterminate state
  if (indeterminate) {
    return (
      <box flexDirection="row" gap={0}>
        {/* Label (if provided) */}
        {label && (
          <text>
            <span fg="white">{label} </span>
          </text>
        )}

        {/* Spinner with brackets */}
        <text>
          <span fg="gray">{PROGRESS_CHARS.leftBracket}</span>
          <span fg="cyan">{spinnerFrame}</span>
          <span fg="gray">
            {" ".repeat(width - 1)}
            {PROGRESS_CHARS.rightBracket}
          </span>
        </text>
      </box>
    );
  }

  // Build the progress bar
  const { filled, empty } = buildProgressBar(clampedProgress, width);

  return (
    <box flexDirection="row" gap={0}>
      {/* Label (if provided) */}
      {label && (
        <text>
          <span fg="white">{label} </span>
        </text>
      )}

      {/* Progress bar with brackets */}
      <text>
        <span fg="gray">{PROGRESS_CHARS.leftBracket}</span>
        <span fg={barColor}>{filled}</span>
        <span fg="gray">{empty}</span>
        <span fg="gray">{PROGRESS_CHARS.rightBracket}</span>
      </text>

      {/* Percentage text (if enabled) */}
      {showPercentage && (
        <text>
          <span fg="gray"> {Math.round(clampedProgress)}%</span>
        </text>
      )}

      {/* Completion checkmark */}
      {showCompletionMark && isComplete && (
        <text>
          <span fg="green"> {STATUS_ICONS.success}</span>
        </text>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ProgressBar;
