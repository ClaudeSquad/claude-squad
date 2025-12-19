/**
 * Header Component
 *
 * Displays the application header with title and session info.
 * Styled to match the design: dark background, "SQUAD — project" on left, "[?] Help" on right.
 */

/**
 * Header props
 */
export interface HeaderProps {
  /** Project name to display */
  projectName?: string;
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
 * Displays Claude Squad branding and current project/session context.
 *
 * @example
 * ```tsx
 * <Header projectName="my-awesome-app" />
 * ```
 */
export function Header({ projectName, sessionName, featureName, debug }: HeaderProps) {
  // Get project name from path if provided
  const displayName = projectName || sessionName || "project";

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={2}
      paddingRight={2}
      height={1}
    >
      {/* Left: SQUAD — project-name */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg="white" bold>SQUAD</span>
          <span fg="gray"> — </span>
          <span fg="green">{displayName}</span>
        </text>
        {debug && (
          <text>
            <span fg="yellow"> [DEBUG]</span>
          </text>
        )}
        {featureName && (
          <text>
            <span fg="gray"> / </span>
            <span fg="cyan">{featureName}</span>
          </text>
        )}
      </box>

      {/* Right: [?] Help */}
      <box>
        <text>
          <span fg="gray">[</span>
          <span fg="cyan">?</span>
          <span fg="gray">] Help</span>
        </text>
      </box>
    </box>
  );
}

export default Header;
