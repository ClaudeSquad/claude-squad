/**
 * Welcome Screen
 *
 * Entry point screen displayed when launching Claude Squad.
 * Shows ASCII logo, initialization status, and available commands.
 */

import { registerScreen } from "../router.js";

// ============================================================================
// ASCII Logo
// ============================================================================

/**
 * Claude Squad ASCII art logo.
 * Fits within 80 character width.
 */
const LOGO = `
   _____ _                 _        _____                       _
  / ____| |               | |      / ____|                     | |
 | |    | | __ _ _   _  __| | ___ | (___   __ _ _   _  __ _  __| |
 | |    | |/ _\` | | | |/ _\` |/ _ \\ \\___ \\ / _\` | | | |/ _\` |/ _\` |
 | |____| | (_| | |_| | (_| |  __/ ____) | (_| | |_| | (_| | (_| |
  \\_____|_|\\__,_|\\__,_|\\__,_|\\___||_____/ \\__, |\\__,_|\\__,_|\\__,_|
                                             | |
                                             |_|
`;

/**
 * Compact logo for smaller terminals.
 */
const COMPACT_LOGO = `
  ╔═══════════════════════════════════════╗
  ║         ⚡ CLAUDE SQUAD ⚡            ║
  ║     AI-Powered Development Teams      ║
  ╚═══════════════════════════════════════╝
`;

// ============================================================================
// Welcome Screen Props
// ============================================================================

/**
 * Props for the Welcome Screen.
 */
export interface WelcomeScreenProps {
  /** Whether Squad is initialized for this project */
  isInitialized?: boolean;
  /** Project path */
  projectPath?: string;
  /** Recent sessions for quick resume */
  recentSessions?: Array<{
    id: string;
    name: string;
    lastActive: Date;
    status: string;
  }>;
  /** Terminal width for responsive layout */
  terminalWidth?: number;
  /** Version string */
  version?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Logo display component.
 */
function LogoDisplay({ compact = false }: { compact?: boolean }) {
  const logo = compact ? COMPACT_LOGO : LOGO;

  return (
    <box flexDirection="column" alignItems="center">
      <text>
        <span fg="cyan">{logo}</span>
      </text>
    </box>
  );
}

/**
 * Command hint component.
 */
function CommandHint({
  command,
  description,
  highlight = false,
}: {
  command: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <box flexDirection="row" gap={2} paddingLeft={2}>
      <text>
        <span fg={highlight ? "green" : "yellow"}>{command.padEnd(24)}</span>
      </text>
      <text>
        <span fg={highlight ? "white" : "gray"}>{description}</span>
      </text>
    </box>
  );
}

/**
 * Section title component.
 */
function SectionTitle({ title }: { title: string }) {
  return (
    <box paddingTop={1} paddingBottom={1}>
      <text>
        <span fg="white">{title}</span>
      </text>
    </box>
  );
}

/**
 * Keyboard shortcut hint.
 */
function KeyboardShortcut({ keys, action }: { keys: string; action: string }) {
  return (
    <box flexDirection="row" gap={1}>
      <text>
        <span fg="cyan">[{keys}]</span>
      </text>
      <text>
        <span fg="gray">{action}</span>
      </text>
    </box>
  );
}

/**
 * Recent session item.
 */
function RecentSessionItem({
  name,
  lastActive,
  status,
}: {
  name: string;
  lastActive: Date;
  status: string;
}) {
  const timeAgo = formatTimeAgo(lastActive);
  const statusColor = status === "active" ? "green" : status === "paused" ? "yellow" : "gray";

  return (
    <box flexDirection="row" gap={2} paddingLeft={4}>
      <text>
        <span fg="white">• {name.padEnd(20)}</span>
      </text>
      <text>
        <span fg={statusColor}>{status.padEnd(10)}</span>
      </text>
      <text>
        <span fg="gray">{timeAgo}</span>
      </text>
    </box>
  );
}

/**
 * Format a date as "X ago" string.
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

// ============================================================================
// Welcome Screen Component
// ============================================================================

/**
 * Welcome Screen Component
 *
 * Entry point that displays when Claude Squad launches.
 * Shows different content based on initialization state.
 *
 * @example
 * ```tsx
 * <WelcomeScreen
 *   isInitialized={true}
 *   projectPath="/my/project"
 *   recentSessions={[{ id: "123", name: "auth-feature", ... }]}
 * />
 * ```
 */
export function WelcomeScreen({
  params,
  isInitialized,
  projectPath,
  recentSessions,
  terminalWidth,
  version,
}: WelcomeScreenProps & { params?: Record<string, unknown> }) {
  // Support both direct props and router params
  const _isInitialized = isInitialized ?? (params?.isInitialized as boolean) ?? false;
  const _projectPath = projectPath ?? (params?.projectPath as string) ?? process.cwd();
  const _recentSessions = recentSessions ?? (params?.recentSessions as WelcomeScreenProps["recentSessions"]) ?? [];
  const _terminalWidth = terminalWidth ?? (params?.terminalWidth as number) ?? 80;
  const _version = version ?? (params?.version as string) ?? "0.1.0";
  const useCompactLogo = _terminalWidth < 70;

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      flexGrow={1}
      paddingTop={1}
    >
      {/* Logo */}
      <LogoDisplay compact={useCompactLogo} />

      {/* Version */}
      <box paddingBottom={1}>
        <text>
          <span fg="gray">v{_version}</span>
        </text>
      </box>

      {/* Main content based on state */}
      {_isInitialized ? (
        <InitializedContent
          projectPath={_projectPath}
          recentSessions={_recentSessions}
        />
      ) : (
        <UninitializedContent projectPath={_projectPath} />
      )}

      {/* Keyboard shortcuts footer */}
      <box
        flexDirection="row"
        gap={3}
        paddingTop={2}
        justifyContent="center"
      >
        <KeyboardShortcut keys="/" action="Command" />
        <KeyboardShortcut keys="?" action="Help" />
        <KeyboardShortcut keys="Ctrl+C" action="Exit" />
      </box>
    </box>
  );
}

/**
 * Content for uninitialized projects.
 */
function UninitializedContent({ projectPath }: { projectPath: string }) {
  return (
    <box flexDirection="column" alignItems="center" gap={1}>
      {/* Status message */}
      <box paddingTop={1} paddingBottom={1}>
        <text>
          <span fg="yellow">⚠ Squad is not initialized for this project</span>
        </text>
      </box>

      {/* Project path */}
      <box>
        <text>
          <span fg="gray">Project: </span>
          <span fg="white">{truncatePath(projectPath, 50)}</span>
        </text>
      </box>

      {/* Init command */}
      <SectionTitle title="Get Started" />
      <CommandHint
        command="/init"
        description="Initialize Squad for this project"
        highlight
      />

      {/* Tip */}
      <box paddingTop={2}>
        <text>
          <span fg="gray">
            💡 Tip: Run{" "}
          </span>
          <span fg="green">/init</span>
          <span fg="gray">
            {" "}to configure Squad for your project
          </span>
        </text>
      </box>
    </box>
  );
}

/**
 * Content for initialized projects.
 */
function InitializedContent({
  projectPath,
  recentSessions,
}: {
  projectPath: string;
  recentSessions: WelcomeScreenProps["recentSessions"];
}) {
  const hasRecentSessions = recentSessions && recentSessions.length > 0;

  return (
    <box flexDirection="column" alignItems="center" gap={1}>
      {/* Welcome message */}
      <box paddingTop={1} paddingBottom={1}>
        <text>
          <span fg="green">✓ Ready to build something great!</span>
        </text>
      </box>

      {/* Project path */}
      <box>
        <text>
          <span fg="gray">Project: </span>
          <span fg="white">{truncatePath(projectPath, 50)}</span>
        </text>
      </box>

      {/* Quick Start Commands */}
      <SectionTitle title="Quick Start" />
      <CommandHint
        command="/feature <description>"
        description="Start a new feature"
        highlight
      />
      <CommandHint
        command="/sessions"
        description="View and manage sessions"
      />
      <CommandHint command="/agents" description="Manage agents" />
      <CommandHint command="/help" description="Show all commands" />

      {/* Recent Sessions */}
      {hasRecentSessions && (
        <>
          <SectionTitle title="Recent Sessions" />
          {recentSessions!.slice(0, 3).map((session) => (
            <RecentSessionItem
              key={session.id}
              name={session.name}
              lastActive={session.lastActive}
              status={session.status}
            />
          ))}
          {recentSessions!.length > 3 && (
            <box paddingLeft={4}>
              <text>
                <span fg="gray">
                  ... and {recentSessions!.length - 3} more. Use /sessions to see all.
                </span>
              </text>
            </box>
          )}
        </>
      )}

      {/* Natural language tip */}
      <box paddingTop={2}>
        <text>
          <span fg="gray">💡 Try: "</span>
          <span fg="cyan">build a login page</span>
          <span fg="gray">" or "</span>
          <span fg="cyan">what's the status?</span>
          <span fg="gray">"</span>
        </text>
      </box>
    </box>
  );
}

/**
 * Truncate a file path for display.
 */
function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;

  const parts = path.split("/");
  if (parts.length <= 2) return "..." + path.slice(-maxLength + 3);

  // Keep first and last parts, truncate middle
  const first = parts[0] || "";
  const last = parts.slice(-2).join("/");

  if (first.length + last.length + 5 > maxLength) {
    return "..." + path.slice(-maxLength + 3);
  }

  return `${first}/.../${last}`;
}

// ============================================================================
// Screen Registration
// ============================================================================

/**
 * Default export for the welcome screen.
 */
export default WelcomeScreen;

/**
 * Register the welcome screen with the router.
 */
export function registerWelcomeScreen(): void {
  registerScreen("dashboard", {
    component: WelcomeScreen as any,
    title: "Welcome",
  });
}
