/**
 * Footer Component
 *
 * Displays keyboard shortcuts and status information.
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
}

/**
 * Default shortcuts
 */
const DEFAULT_SHORTCUTS: Shortcut[] = [
  { key: "Ctrl+C", action: "Exit" },
  { key: "Tab", action: "Switch Panel" },
  { key: "/", action: "Command" },
  { key: "?", action: "Help" },
];

/**
 * Footer Component
 *
 * Displays a footer bar with keyboard shortcuts and status information.
 *
 * @example
 * ```tsx
 * <Footer
 *   status="Ready"
 *   statusType="success"
 *   cost={0.42}
 * />
 * ```
 */
export function Footer({
  shortcuts = DEFAULT_SHORTCUTS,
  status,
  statusType = "info",
  cost,
}: FooterProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      backgroundColor="gray"
    >
      {/* Left: Keyboard shortcuts */}
      <box flexDirection="row" gap={2}>
        {shortcuts.map((shortcut, index) => (
          <box key={index} flexDirection="row" gap={1}>
            <text>
              <span fg="black" bg="white">
                {` ${shortcut.key} `}
              </span>
            </text>
            <text>
              <span fg="white">{shortcut.action}</span>
            </text>
          </box>
        ))}
      </box>

      {/* Right: Status and cost */}
      <box flexDirection="row" gap={2}>
        {/* Cost display */}
        {cost !== undefined && (
          <text>
            <span fg="gray">
              Cost:
            </span>{" "}
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
