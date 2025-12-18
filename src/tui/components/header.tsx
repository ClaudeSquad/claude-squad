/**
 * Header Component
 *
 * Displays the application header with title and session info.
 */

/**
 * Header props
 */
export interface HeaderProps {
  /** Session name or status to display */
  sessionName?: string;
  /** Current feature being worked on */
  featureName?: string;
  /** Show debug indicator */
  debug?: boolean;
}

/**
 * Header Component
 *
 * Displays Claude Squad branding and current session context.
 *
 * @example
 * ```tsx
 * <Header sessionName="my-project" featureName="Add login" />
 * ```
 */
export function Header({ sessionName, featureName, debug }: HeaderProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
      backgroundColor="blue"
    >
      {/* Left: Title */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg="white">
            ⚡ Claude Squad
          </span>
        </text>
        {debug && (
          <text>
            <span fg="yellow">[DEBUG]</span>
          </text>
        )}
      </box>

      {/* Center: Feature name */}
      {featureName && (
        <box>
          <text>
            <span fg="gray">
              Feature:
            </span>{" "}
            <span fg="cyan">{featureName}</span>
          </text>
        </box>
      )}

      {/* Right: Session info */}
      <box>
        {sessionName ? (
          <text>
            <span fg="gray">
              Session:
            </span>{" "}
            <span fg="green">{sessionName}</span>
          </text>
        ) : (
          <text>
            <span fg="gray">
              No active session
            </span>
          </text>
        )}
      </box>
    </box>
  );
}

export default Header;
