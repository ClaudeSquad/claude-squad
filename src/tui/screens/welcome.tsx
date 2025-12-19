/**
 * Welcome Screen
 *
 * Entry point screen displayed when launching Claude Squad.
 * Styled to match the design: centered logo, tagline pill, command card.
 */

import { useTerminalDimensions } from "@opentui/react";
import { registerScreen } from "../router.js";

// ============================================================================
// ASCII Logo - Smaller, cleaner style to match design
// ============================================================================

/**
 * Claude Squad ASCII art logo - pixelated block style.
 * Designed to render in white/light color on dark background.
 */
const LOGO = `
 ██████╗ ██╗      █████╗ ██╗   ██╗██████╗  ███████╗
██╔════╝ ██║     ██╔══██╗██║   ██║██╔══██╗ ██╔════╝
██║      ██║     ███████║██║   ██║██║  ██║ █████╗
██║      ██║     ██╔══██║██║   ██║██║  ██║ ██╔══╝
╚██████╗ ███████╗██║  ██║╚██████╔╝██████╔╝ ███████╗
 ╚═════╝ ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚══════╝
      ███████╗ ██████╗ ██╗   ██╗ █████╗ ██████╗
      ██╔════╝██╔═══██╗██║   ██║██╔══██╗██╔══██╗
      ███████╗██║   ██║██║   ██║███████║██║  ██║
      ╚════██║██║▄▄ ██║██║   ██║██╔══██║██║  ██║
      ███████║╚██████╔╝╚██████╔╝██║  ██║██████╔╝
      ╚══════╝ ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═════╝    `;

/**
 * Compact logo for smaller terminals (< 60 cols).
 */
const COMPACT_LOGO = `
╔═══════════════════════════════════════╗
║           CLAUDE SQUAD                ║
╚═══════════════════════════════════════╝`;

/**
 * Very compact logo for tiny terminals (< 45 cols).
 */
const TINY_LOGO = `
┌───────────────────┐
│   CLAUDE SQUAD    │
└───────────────────┘`;

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
  /** Project name (derived from path if not provided) */
  projectName?: string;
  /** Terminal width for responsive layout */
  terminalWidth?: number;
  /** Terminal height for responsive layout */
  terminalHeight?: number;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Logo display component - renders in white on dark background.
 * Responsive to both width AND height.
 *
 * Height thresholds:
 * - >= 28: Full ASCII logo (12 lines)
 * - >= 18: Compact text logo (3 lines)
 * - >= 14: Tiny text logo (3 lines)
 * - < 14: No logo (hidden)
 */
function LogoDisplay({
  terminalWidth = 80,
  terminalHeight = 24
}: {
  terminalWidth?: number;
  terminalHeight?: number;
}) {
  // Height-based logo selection (takes priority)
  // Full logo needs ~28 rows total, compact needs ~18, tiny needs ~14
  if (terminalHeight < 14) {
    // Too short - hide logo entirely
    return null;
  }

  let logo = LOGO;

  // First check height constraints
  if (terminalHeight < 18) {
    logo = TINY_LOGO;
  } else if (terminalHeight < 28) {
    logo = COMPACT_LOGO;
  }

  // Then check width constraints (may further reduce)
  if (terminalWidth < 45) {
    logo = TINY_LOGO;
  } else if (terminalWidth < 60 && logo === LOGO) {
    logo = COMPACT_LOGO;
  }

  return (
    <box flexDirection="column" alignItems="center">
      <text>
        <span fg="white">{logo}</span>
      </text>
    </box>
  );
}

/**
 * Tagline pill - "MULTI-AGENT WORKFLOWS" styled like a rounded button with cyan background.
 */
function TaglinePill({
  terminalWidth = 80,
  terminalHeight = 24
}: {
  terminalWidth?: number;
  terminalHeight?: number;
}) {
  const text = "M U L T I - A G E N T   W O R K F L O W S";
  const shortText = "MULTI-AGENT WORKFLOWS";
  const displayText = terminalWidth < 60 ? shortText : text;

  // Create pill-like appearance with cyan/teal background
  const padding = 2;
  const pillContent = " ".repeat(padding) + displayText + " ".repeat(padding);

  // Reduce vertical padding on short terminals
  const vertPadding = terminalHeight < 20 ? 0 : 1;

  return (
    <box flexDirection="column" alignItems="center" paddingTop={vertPadding} paddingBottom={vertPadding}>
      <text>
        <span bg="#1a4a4a" fg="#4ecdc4">{pillContent}</span>
      </text>
    </box>
  );
}

/**
 * Command row in the quick start card.
 */
function CommandRow({
  command,
  description,
}: {
  command: string;
  description: string;
}) {
  return (
    <box flexDirection="row">
      <text>
        <span fg="#f0c674">{command.padEnd(18)}</span>
        <span fg="#888888">{description}</span>
      </text>
    </box>
  );
}

/**
 * Quick start command card - dark card with border and background.
 */
function QuickStartCard({
  terminalHeight = 24
}: {
  terminalHeight?: number;
}) {
  // Reduce padding on short terminals
  const topPadding = terminalHeight < 20 ? 1 : 2;
  const innerPadding = terminalHeight < 18 ? 1 : 2;
  const commandGap = terminalHeight < 18 ? 0 : 1;

  return (
    <box
      flexDirection="column"
      alignItems="center"
      paddingTop={topPadding}
    >
      <box
        flexDirection="column"
        paddingTop={innerPadding}
        paddingBottom={innerPadding}
        paddingLeft={3}
        paddingRight={3}
      >
        {/* Commands */}
        <CommandRow
          command="/feature <desc>"
          description="Start a new feature"
        />
        {commandGap > 0 && <box height={commandGap} />}
        <CommandRow
          command="/sessions"
          description="View and resume sessions"
        />

        {/* Placeholder text inside card */}
        <box paddingTop={innerPadding}>
          <text>
            <span fg="#666666">
              Type a command or describe what you want to build
            </span>
          </text>
        </box>
      </box>
    </box>
  );
}


// ============================================================================
// Welcome Screen Component
// ============================================================================

/**
 * Welcome Screen Component
 *
 * Entry point that displays when Claude Squad launches.
 * Centered layout with logo, tagline, and command card.
 *
 * @example
 * ```tsx
 * <WelcomeScreen
 *   isInitialized={true}
 *   projectName="my-awesome-app"
 *   terminalWidth={120}
 * />
 * ```
 */
export function WelcomeScreen({
  params,
  isInitialized,
  projectPath,
  projectName,
  terminalWidth,
  terminalHeight,
}: WelcomeScreenProps & { params?: Record<string, unknown> }) {
  // Get actual terminal dimensions from OpenTUI hook
  const dimensions = useTerminalDimensions();

  // Support both direct props, router params, and hook values
  const _isInitialized = isInitialized ?? (params?.isInitialized as boolean) ?? true;
  const _projectPath = projectPath ?? (params?.projectPath as string) ?? process.cwd();
  const _projectName = projectName ?? (params?.projectName as string) ?? getProjectName(_projectPath);
  const _terminalWidth = terminalWidth ?? (params?.terminalWidth as number) ?? dimensions.width ?? 80;
  const _terminalHeight = terminalHeight ?? (params?.terminalHeight as number) ?? dimensions.height ?? 24;

  // Calculate content height based on what will be shown
  // Full logo: 12, compact: 3, tiny: 3, none: 0
  let logoHeight = 12;
  if (_terminalHeight < 14) {
    logoHeight = 0;
  } else if (_terminalHeight < 18 || _terminalWidth < 45) {
    logoHeight = 3;
  } else if (_terminalHeight < 28 || _terminalWidth < 60) {
    logoHeight = 3;
  }

  // Total content: logo + tagline(3) + commands(6) + cursor(2)
  const contentHeight = logoHeight + 3 + 6 + 2;
  const topPadding = Math.max(0, Math.floor((_terminalHeight - contentHeight - 1) / 3));

  return (
    <box
      flexDirection="column"
      alignItems="center"
      justifyContent="flex-start"
      flexGrow={1}
      paddingTop={topPadding}
    >
      {/* Logo - responsive to both width and height */}
      <LogoDisplay terminalWidth={_terminalWidth} terminalHeight={_terminalHeight} />

      {/* Tagline pill */}
      <TaglinePill terminalWidth={_terminalWidth} terminalHeight={_terminalHeight} />

      {/* Quick start card */}
      <QuickStartCard terminalHeight={_terminalHeight} />
    </box>
  );
}

/**
 * Extract project name from path.
 */
function getProjectName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || "project";
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
