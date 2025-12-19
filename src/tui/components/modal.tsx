/**
 * Modal Component
 *
 * A centered overlay modal with title, content, actions, and keyboard shortcuts.
 * Supports different sizes, variants, and focus management.
 */

import { useState, useEffect, type ReactNode } from "react";
import {
  BORDER_COLORS,
  PRIMARY_COLORS,
  TEXT_COLORS,
  STATUS_ICONS,
  type TerminalColor,
} from "../theme/index.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Modal size preset.
 */
export type ModalSize = "small" | "medium" | "large" | "fullscreen";

/**
 * Modal variant/style.
 */
export type ModalVariant = "default" | "info" | "success" | "warning" | "error";

/**
 * Action button definition.
 */
export interface ModalAction {
  /** Button label */
  label: string;
  /** Keyboard shortcut key (e.g., "Enter", "Escape") */
  key?: string;
  /** Action handler */
  onAction: () => void;
  /** Whether this is the primary action */
  primary?: boolean;
  /** Whether this is a destructive action */
  destructive?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Keyboard shortcut display.
 */
export interface ModalShortcut {
  /** Key combination */
  key: string;
  /** Action description */
  action: string;
}

/**
 * Props for the Modal component.
 */
export interface ModalProps {
  /** Modal title */
  title: string;
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should close */
  onClose?: () => void;
  /** Modal size (default: "medium") */
  size?: ModalSize;
  /** Modal variant (default: "default") */
  variant?: ModalVariant;
  /** Action buttons to display */
  actions?: ModalAction[];
  /** Keyboard shortcuts to display in footer */
  shortcuts?: ModalShortcut[];
  /** Status text to display in header */
  status?: string;
  /** Whether to show close button (default: true) */
  showCloseButton?: boolean;
  /** Custom border color */
  borderColor?: TerminalColor;
  /** Modal content */
  children: ReactNode;
  /** Terminal width for sizing calculations */
  terminalWidth?: number;
  /** Terminal height for sizing calculations */
  terminalHeight?: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Size presets for modal dimensions (percentage of terminal).
 */
const SIZE_PRESETS: Record<ModalSize, { width: number; height: number }> = {
  small: { width: 0.4, height: 0.4 },
  medium: { width: 0.6, height: 0.6 },
  large: { width: 0.8, height: 0.8 },
  fullscreen: { width: 0.95, height: 0.95 },
};

/**
 * Variant colors for modal header.
 */
const VARIANT_COLORS: Record<ModalVariant, TerminalColor> = {
  default: "cyan",
  info: "blue",
  success: "green",
  warning: "yellow",
  error: "red",
};

/**
 * Variant icons.
 */
const VARIANT_ICONS: Record<ModalVariant, string> = {
  default: "",
  info: STATUS_ICONS.info,
  success: STATUS_ICONS.success,
  warning: STATUS_ICONS.warning,
  error: STATUS_ICONS.error,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate modal dimensions based on size preset and terminal dimensions.
 */
function calculateDimensions(
  size: ModalSize,
  terminalWidth: number,
  terminalHeight: number
): { width: number; height: number } {
  const preset = SIZE_PRESETS[size];
  return {
    width: Math.floor(terminalWidth * preset.width),
    height: Math.floor(terminalHeight * preset.height),
  };
}

/**
 * Calculate centering position.
 */
function calculatePosition(
  modalWidth: number,
  modalHeight: number,
  terminalWidth: number,
  terminalHeight: number
): { left: number; top: number } {
  return {
    left: Math.floor((terminalWidth - modalWidth) / 2),
    top: Math.floor((terminalHeight - modalHeight) / 2),
  };
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Modal Component
 *
 * Renders a centered overlay modal with title bar, content area,
 * action buttons, and keyboard shortcuts footer.
 *
 * @example
 * ```tsx
 * // Basic modal
 * <Modal
 *   title="Confirm Action"
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   actions={[
 *     { label: "Cancel", key: "Esc", onAction: handleCancel },
 *     { label: "Confirm", key: "Enter", onAction: handleConfirm, primary: true },
 *   ]}
 * >
 *   <text>Are you sure you want to proceed?</text>
 * </Modal>
 *
 * // Error modal with warning variant
 * <Modal
 *   title="Error"
 *   visible={showError}
 *   variant="error"
 *   size="small"
 *   onClose={dismissError}
 * >
 *   <text>An error occurred while processing your request.</text>
 * </Modal>
 * ```
 */
export function Modal({
  title,
  visible,
  onClose,
  size = "medium",
  variant = "default",
  actions = [],
  shortcuts = [],
  status,
  showCloseButton = true,
  borderColor: customBorderColor,
  children,
  terminalWidth = 120,
  terminalHeight = 40,
}: ModalProps) {
  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Calculate dimensions and position
  const dimensions = calculateDimensions(size, terminalWidth, terminalHeight);
  const position = calculatePosition(
    dimensions.width,
    dimensions.height,
    terminalWidth,
    terminalHeight
  );

  // Get variant styling
  const variantColor = VARIANT_COLORS[variant];
  const variantIcon = VARIANT_ICONS[variant];
  const borderColor = customBorderColor ?? variantColor;

  // Default shortcuts based on actions
  const defaultShortcuts: ModalShortcut[] = [
    ...(showCloseButton && onClose ? [{ key: "Esc", action: "Close" }] : []),
    ...actions
      .filter((a) => a.key)
      .map((a) => ({ key: a.key!, action: a.label })),
  ];
  const displayShortcuts = shortcuts.length > 0 ? shortcuts : defaultShortcuts;

  // Calculate content height (total - header - footer - actions)
  const headerHeight = 1;
  const footerHeight = displayShortcuts.length > 0 ? 1 : 0;
  const actionsHeight = actions.length > 0 ? 2 : 0;
  const borderHeight = 2;
  const contentHeight =
    dimensions.height - headerHeight - footerHeight - actionsHeight - borderHeight;

  return (
    <box
      position="absolute"
      left={position.left}
      top={position.top}
      width={dimensions.width}
      height={dimensions.height}
      flexDirection="column"
      borderStyle="double"
      borderColor={borderColor}
    >
      {/* Header */}
      <ModalHeader
        title={title}
        status={status}
        variant={variant}
        variantIcon={variantIcon}
        variantColor={variantColor}
        showCloseButton={showCloseButton}
        width={dimensions.width - 2}
      />

      {/* Content */}
      <box
        flexDirection="column"
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
        paddingTop={1}
        paddingBottom={1}
        overflow="hidden"
      >
        {children}
      </box>

      {/* Actions */}
      {actions.length > 0 && (
        <ModalActions actions={actions} width={dimensions.width - 2} />
      )}

      {/* Footer with shortcuts */}
      {displayShortcuts.length > 0 && (
        <ModalFooter shortcuts={displayShortcuts} borderColor={borderColor} />
      )}
    </box>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface ModalHeaderProps {
  title: string;
  status?: string;
  variant: ModalVariant;
  variantIcon: string;
  variantColor: TerminalColor;
  showCloseButton: boolean;
  width: number;
}

/**
 * Modal header with title and status.
 */
function ModalHeader({
  title,
  status,
  variant,
  variantIcon,
  variantColor,
  showCloseButton,
  width,
}: ModalHeaderProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
    >
      {/* Title */}
      <box flexDirection="row" gap={1}>
        {variantIcon && (
          <text>
            <span fg={variantColor}>{variantIcon}</span>
          </text>
        )}
        <text>
          <span fg={variantColor} bold>
            {title}
          </span>
        </text>
      </box>

      {/* Right side: status and close hint */}
      <box flexDirection="row" gap={2}>
        {status && (
          <text>
            <span fg="gray">{status}</span>
          </text>
        )}
        {showCloseButton && (
          <text>
            <span fg="gray">[Esc] Close</span>
          </text>
        )}
      </box>
    </box>
  );
}

interface ModalActionsProps {
  actions: ModalAction[];
  width: number;
}

/**
 * Modal action buttons row.
 */
function ModalActions({ actions, width }: ModalActionsProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="flex-end"
      gap={2}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      height={2}
    >
      {actions.map((action, index) => (
        <ModalButton key={index} action={action} />
      ))}
    </box>
  );
}

interface ModalButtonProps {
  action: ModalAction;
}

/**
 * Individual action button.
 */
function ModalButton({ action }: ModalButtonProps) {
  const { label, key, primary, destructive, disabled } = action;

  // Determine colors based on button type
  let bgColor: TerminalColor = "gray";
  let fgColor: TerminalColor = "white";

  if (disabled) {
    bgColor = "gray";
    fgColor = "gray";
  } else if (destructive) {
    bgColor = "red";
    fgColor = "white";
  } else if (primary) {
    bgColor = "cyan";
    fgColor = "black";
  }

  // Build button text
  const buttonText = key ? `${label} (${key})` : label;

  return (
    <text>
      <span bg={bgColor} fg={fgColor}>
        {` ${buttonText} `}
      </span>
    </text>
  );
}

interface ModalFooterProps {
  shortcuts: ModalShortcut[];
  borderColor: TerminalColor;
}

/**
 * Modal footer with keyboard shortcuts.
 */
function ModalFooter({ shortcuts, borderColor }: ModalFooterProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="center"
      gap={2}
      height={1}
      borderTop={1}
      borderColor={borderColor}
      paddingLeft={1}
      paddingRight={1}
    >
      {shortcuts.map((shortcut, index) => (
        <box key={index} flexDirection="row" gap={0}>
          <text>
            <span fg="cyan">{shortcut.key}</span>
            <span fg="gray">: {shortcut.action}</span>
          </text>
          {index < shortcuts.length - 1 && (
            <text>
              <span fg="gray"> • </span>
            </text>
          )}
        </box>
      ))}
    </box>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Props for ConfirmModal.
 */
export interface ConfirmModalProps {
  /** Modal title */
  title: string;
  /** Confirmation message */
  message: string;
  /** Whether the modal is visible */
  visible: boolean;
  /** Confirm button label (default: "Confirm") */
  confirmLabel?: string;
  /** Cancel button label (default: "Cancel") */
  cancelLabel?: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Whether the confirm action is destructive */
  destructive?: boolean;
  /** Terminal dimensions */
  terminalWidth?: number;
  terminalHeight?: number;
}

/**
 * Pre-configured confirmation modal.
 */
export function ConfirmModal({
  title,
  message,
  visible,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  terminalWidth,
  terminalHeight,
}: ConfirmModalProps) {
  return (
    <Modal
      title={title}
      visible={visible}
      onClose={onCancel}
      size="small"
      variant={destructive ? "warning" : "default"}
      actions={[
        { label: cancelLabel, key: "Esc", onAction: onCancel },
        {
          label: confirmLabel,
          key: "Enter",
          onAction: onConfirm,
          primary: !destructive,
          destructive,
        },
      ]}
      terminalWidth={terminalWidth}
      terminalHeight={terminalHeight}
    >
      <text>
        <span fg="white">{message}</span>
      </text>
    </Modal>
  );
}

/**
 * Props for AlertModal.
 */
export interface AlertModalProps {
  /** Modal title */
  title: string;
  /** Alert message */
  message: string;
  /** Whether the modal is visible */
  visible: boolean;
  /** Alert variant */
  variant?: "info" | "success" | "warning" | "error";
  /** Dismiss button label (default: "OK") */
  dismissLabel?: string;
  /** Callback when dismissed */
  onDismiss: () => void;
  /** Terminal dimensions */
  terminalWidth?: number;
  terminalHeight?: number;
}

/**
 * Pre-configured alert modal.
 */
export function AlertModal({
  title,
  message,
  visible,
  variant = "info",
  dismissLabel = "OK",
  onDismiss,
  terminalWidth,
  terminalHeight,
}: AlertModalProps) {
  return (
    <Modal
      title={title}
      visible={visible}
      onClose={onDismiss}
      size="small"
      variant={variant}
      actions={[{ label: dismissLabel, key: "Enter", onAction: onDismiss, primary: true }]}
      terminalWidth={terminalWidth}
      terminalHeight={terminalHeight}
    >
      <text>
        <span fg="white">{message}</span>
      </text>
    </Modal>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Modal;
