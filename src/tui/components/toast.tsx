/**
 * Toast Component
 *
 * A notification component for displaying temporary messages.
 * Supports multiple variants, auto-dismiss, and stacking.
 */

import { useState, useEffect, useRef, type ReactNode } from "react";
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
 * Toast notification type/variant.
 */
export type ToastType = "info" | "success" | "warning" | "error";

/**
 * Toast position on screen.
 */
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/**
 * Individual toast data.
 */
export interface ToastData {
  /** Unique identifier */
  id: string;
  /** Toast type/variant */
  type: ToastType;
  /** Toast message */
  message: string;
  /** Optional title */
  title?: string;
  /** Duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Whether the toast can be dismissed by user */
  dismissible?: boolean;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
}

/**
 * Props for the Toast component.
 */
export interface ToastProps {
  /** Toast data */
  toast: ToastData;
  /** Callback when toast should be removed */
  onRemove: (id: string) => void;
  /** Toast width */
  width?: number;
}

/**
 * Props for the ToastContainer component.
 */
export interface ToastContainerProps {
  /** Array of toast notifications to display */
  toasts: ToastData[];
  /** Position on screen */
  position?: ToastPosition;
  /** Callback when a toast should be removed */
  onRemove: (id: string) => void;
  /** Maximum number of visible toasts */
  maxVisible?: number;
  /** Width of each toast */
  toastWidth?: number;
  /** Terminal width for positioning */
  terminalWidth?: number;
  /** Terminal height for positioning */
  terminalHeight?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default toast duration in milliseconds.
 */
export const DEFAULT_TOAST_DURATION = 5000;

/**
 * Colors for toast variants.
 */
const TOAST_COLORS: Record<ToastType, TerminalColor> = {
  info: "cyan",
  success: "green",
  warning: "yellow",
  error: "red",
};

/**
 * Icons for toast variants.
 */
const TOAST_ICONS: Record<ToastType, string> = {
  info: STATUS_ICONS.info,
  success: STATUS_ICONS.success,
  warning: STATUS_ICONS.warning,
  error: STATUS_ICONS.error,
};

/**
 * Background colors for toast variants.
 */
const TOAST_BG_COLORS: Record<ToastType, TerminalColor> = {
  info: "blue",
  success: "green",
  warning: "yellow",
  error: "red",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate toast container position.
 */
function calculateContainerPosition(
  position: ToastPosition,
  terminalWidth: number,
  terminalHeight: number,
  toastWidth: number
): { left: number; top: number; flexDirection: "column" | "column-reverse" } {
  const padding = 2;
  let left = padding;
  let top = padding;
  let flexDirection: "column" | "column-reverse" = "column";

  switch (position) {
    case "top-left":
      left = padding;
      top = padding;
      flexDirection = "column";
      break;
    case "top-center":
      left = Math.floor((terminalWidth - toastWidth) / 2);
      top = padding;
      flexDirection = "column";
      break;
    case "top-right":
      left = terminalWidth - toastWidth - padding;
      top = padding;
      flexDirection = "column";
      break;
    case "bottom-left":
      left = padding;
      top = terminalHeight - padding - 3; // Toast height + padding
      flexDirection = "column-reverse";
      break;
    case "bottom-center":
      left = Math.floor((terminalWidth - toastWidth) / 2);
      top = terminalHeight - padding - 3;
      flexDirection = "column-reverse";
      break;
    case "bottom-right":
      left = terminalWidth - toastWidth - padding;
      top = terminalHeight - padding - 3;
      flexDirection = "column-reverse";
      break;
  }

  return { left, top, flexDirection };
}

/**
 * Generate a unique toast ID.
 */
export function generateToastId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================================================
// Toast Component
// ============================================================================

/**
 * Individual Toast notification.
 *
 * @example
 * ```tsx
 * <Toast
 *   toast={{
 *     id: "toast-1",
 *     type: "success",
 *     message: "Changes saved successfully!",
 *     duration: 3000,
 *   }}
 *   onRemove={(id) => removeToast(id)}
 * />
 * ```
 */
export function Toast({ toast, onRemove, width = 50 }: ToastProps) {
  const { id, type, message, title, duration = DEFAULT_TOAST_DURATION, dismissible = true, onDismiss } = toast;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remaining, setRemaining] = useState(duration);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onDismiss?.();
        onRemove(id);
      }, duration);

      // Update remaining time every second for visual feedback
      const interval = setInterval(() => {
        setRemaining((prev) => Math.max(0, prev - 1000));
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        clearInterval(interval);
      };
    }
  }, [id, duration, onDismiss, onRemove]);

  // Get styling for toast type
  const color = TOAST_COLORS[type];
  const icon = TOAST_ICONS[type];

  return (
    <box
      width={width}
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      marginBottom={1}
    >
      {/* Header row */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
        height={1}
      >
        {/* Icon and title/type */}
        <box flexDirection="row" gap={1}>
          <text>
            <span fg={color}>{icon}</span>
          </text>
          <text>
            <span fg={color} bold>
              {title ?? type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </text>
        </box>

        {/* Dismiss hint and timer */}
        <box flexDirection="row" gap={1}>
          {duration > 0 && (
            <text>
              <span fg="gray">{Math.ceil(remaining / 1000)}s</span>
            </text>
          )}
          {dismissible && (
            <text>
              <span fg="gray">[x]</span>
            </text>
          )}
        </box>
      </box>

      {/* Message */}
      <box paddingLeft={1} paddingRight={1} paddingBottom={1}>
        <text>
          <span fg="white">{message}</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Toast Container Component
// ============================================================================

/**
 * Container for managing and displaying multiple toasts.
 *
 * @example
 * ```tsx
 * const [toasts, setToasts] = useState<ToastData[]>([]);
 *
 * const addToast = (toast: Omit<ToastData, 'id'>) => {
 *   setToasts(prev => [...prev, { ...toast, id: generateToastId() }]);
 * };
 *
 * const removeToast = (id: string) => {
 *   setToasts(prev => prev.filter(t => t.id !== id));
 * };
 *
 * <ToastContainer
 *   toasts={toasts}
 *   position="top-right"
 *   onRemove={removeToast}
 *   terminalWidth={120}
 *   terminalHeight={40}
 * />
 * ```
 */
export function ToastContainer({
  toasts,
  position = "top-right",
  onRemove,
  maxVisible = 5,
  toastWidth = 50,
  terminalWidth = 120,
  terminalHeight = 40,
}: ToastContainerProps) {
  // Calculate position
  const { left, top, flexDirection } = calculateContainerPosition(
    position,
    terminalWidth,
    terminalHeight,
    toastWidth
  );

  // Limit visible toasts
  const visibleToasts = toasts.slice(0, maxVisible);
  const hiddenCount = toasts.length - maxVisible;

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={toastWidth}
      flexDirection={flexDirection}
    >
      {visibleToasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} width={toastWidth} />
      ))}

      {/* Hidden count indicator */}
      {hiddenCount > 0 && (
        <box paddingLeft={1}>
          <text>
            <span fg="gray">+{hiddenCount} more notification{hiddenCount > 1 ? "s" : ""}</span>
          </text>
        </box>
      )}
    </box>
  );
}

// ============================================================================
// Toast Hook
// ============================================================================

/**
 * State and actions for toast management.
 */
export interface UseToastResult {
  /** Current list of toasts */
  toasts: ToastData[];
  /** Add a new toast */
  addToast: (toast: Omit<ToastData, "id">) => string;
  /** Remove a toast by ID */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearToasts: () => void;
  /** Convenience methods for each type */
  info: (message: string, options?: Partial<Omit<ToastData, "id" | "type" | "message">>) => string;
  success: (message: string, options?: Partial<Omit<ToastData, "id" | "type" | "message">>) => string;
  warning: (message: string, options?: Partial<Omit<ToastData, "id" | "type" | "message">>) => string;
  error: (message: string, options?: Partial<Omit<ToastData, "id" | "type" | "message">>) => string;
}

/**
 * Hook for managing toast notifications.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { toasts, success, error, removeToast } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       success("Data saved successfully!");
 *     } catch (err) {
 *       error("Failed to save data");
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleSave}>Save</button>
 *       <ToastContainer toasts={toasts} onRemove={removeToast} />
 *     </>
 *   );
 * }
 * ```
 */
export function useToast(): UseToastResult {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (toast: Omit<ToastData, "id">): string => {
    const id = generateToastId();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  };

  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const clearToasts = (): void => {
    setToasts([]);
  };

  const createTypedToast =
    (type: ToastType) =>
    (message: string, options?: Partial<Omit<ToastData, "id" | "type" | "message">>): string => {
      return addToast({ type, message, ...options });
    };

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    info: createTypedToast("info"),
    success: createTypedToast("success"),
    warning: createTypedToast("warning"),
    error: createTypedToast("error"),
  };
}

// ============================================================================
// Inline Toast Component
// ============================================================================

/**
 * Props for InlineToast component.
 */
export interface InlineToastProps {
  /** Toast type */
  type: ToastType;
  /** Toast message */
  message: string;
  /** Optional title */
  title?: string;
  /** Whether to show icon (default: true) */
  showIcon?: boolean;
  /** Whether the toast can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
}

/**
 * Inline toast for embedding in layouts (not positioned absolutely).
 *
 * @example
 * ```tsx
 * <InlineToast
 *   type="warning"
 *   message="Your session will expire in 5 minutes"
 * />
 * ```
 */
export function InlineToast({
  type,
  message,
  title,
  showIcon = true,
  dismissible = false,
  onDismiss,
}: InlineToastProps) {
  const color = TOAST_COLORS[type];
  const icon = TOAST_ICONS[type];

  return (
    <box
      flexDirection="row"
      gap={1}
      paddingLeft={1}
      paddingRight={1}
      borderStyle="single"
      borderColor={color}
    >
      {showIcon && (
        <text>
          <span fg={color}>{icon}</span>
        </text>
      )}
      <box flexDirection="column" flexGrow={1}>
        {title && (
          <text>
            <span fg={color} bold>
              {title}
            </span>
          </text>
        )}
        <text>
          <span fg="white">{message}</span>
        </text>
      </box>
      {dismissible && (
        <text>
          <span fg="gray">[x]</span>
        </text>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Toast;
