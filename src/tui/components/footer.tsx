/**
 * Footer Component
 *
 * Displays keyboard shortcuts and status information.
 * Styled to match the design: dark background with minimal shortcuts.
 */

import { STATUS_COLORS, type StatusType } from "../theme/index.js";

/**
 * Shortcut definition
 */
interface Shortcut {
  /** Key combination (e.g., "Ctrl+C") */
  key: string;
  /** Action description */
  action: string;
}

/**
 * Footer props
 */
export interface FooterProps {
  /** Custom shortcuts to display */
  shortcuts?: Shortcut[];
  /** Status message */
  status?: string;
  /** Status type for coloring */
  statusType?: StatusType;
  /** Total cost for the session */
  cost?: number;
  /** Show minimal footer (just prompt) */
  minimal?: boolean;
}

/**
 * Default shortcuts - minimal set matching design
 */
const DEFAULT_SHORTCUTS: Shortcut[] = [
  { key: "/", action: "Command" },
  { key: "?", action: "Help" },
  { key: "Ctrl+C", action: "Exit" },
];

/**
 * Footer Component
 *
 * Displays a footer bar with keyboard shortcuts and status information.
 * Supports both full and minimal modes.
 *
 * @example
 * ```tsx
 * <Footer status="Ready" statusType="success" />
 * ```
 */
export function Footer({
  shortcuts = DEFAULT_SHORTCUTS,
  status,
  statusType = "info",
  cost,
  minimal = false,
}: FooterProps) {
  if (minimal) {
    // Minimal footer - just a simple line
    return (
      <box
        flexDirection="row"
        justifyContent="flex-start"
        paddingLeft={2}
        height={1}
      >
        <text>
          <span fg="white">❯ </span>
          <span fg="cyan">█</span>
        </text>
      </box>
    );
  }

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={2}
      paddingRight={2}
      height={1}
    >
      {/* Left: Keyboard shortcuts */}
      <box flexDirection="row" gap={3}>
        {shortcuts.map((shortcut, index) => (
          <box key={index} flexDirection="row" gap={1}>
            <text>
              <span fg="gray">[</span>
              <span fg="cyan">{shortcut.key}</span>
              <span fg="gray">]</span>
            </text>
            <text>
              <span fg="gray">{shortcut.action}</span>
            </text>
          </box>
        ))}
      </box>

      {/* Right: Status and cost */}
      <box flexDirection="row" gap={2}>
        {/* Cost display */}
        {cost !== undefined && (
          <text>
            <span fg="gray">Cost: </span>
            <span fg="yellow">${cost.toFixed(2)}</span>
          </text>
        )}

        {/* Status message */}
        {status && (
          <text>
            <span fg={STATUS_COLORS[statusType]}>{status}</span>
          </text>
        )}
      </box>
    </box>
  );
}

export default Footer;
