/**
 * Message Agent Overlay Component
 *
 * An overlay for sending messages to paused or waiting agents.
 * Supports selecting target agents, composing messages, and
 * broadcasting to multiple agents.
 */

import { useState, type ReactNode } from "react";
import {
  PRIMARY_COLORS,
  TEXT_COLORS,
  STATUS_ICONS,
  AGENT_STATUS_COLORS,
  AGENT_STATUS_ICONS,
  getAgentStatusColor,
  getAgentStatusIcon,
  type TerminalColor,
} from "../theme/index.js";
import type { AgentStatus } from "../../core/entities/agent.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Agent information for display.
 */
export interface AgentInfo {
  /** Agent ID */
  id: string;
  /** Display name */
  name: string;
  /** Current status */
  status: AgentStatus;
  /** Current context/task description */
  context?: string;
  /** Role description */
  role?: string;
}

/**
 * Props for the MessageAgentOverlay component.
 */
export interface MessageAgentOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Available agents to message */
  agents: AgentInfo[];
  /** Pre-selected agent ID (if messaging a specific agent) */
  selectedAgentId?: string;
  /** Callback when message is sent */
  onSend: (agentId: string | string[], message: string) => void;
  /** Callback when overlay is closed */
  onClose: () => void;
  /** Enable broadcast mode (message all agents) */
  enableBroadcast?: boolean;
  /** Placeholder text for message input */
  placeholder?: string;
  /** Terminal width for sizing */
  terminalWidth?: number;
  /** Terminal height for sizing */
  terminalHeight?: number;
}

/**
 * Internal state for the overlay.
 */
interface OverlayState {
  /** Currently selected agent index in list */
  selectedIndex: number;
  /** Message text */
  message: string;
  /** Whether in broadcast mode */
  broadcastMode: boolean;
  /** Focus: "agents" | "message" */
  focus: "agents" | "message";
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Agents that can receive messages (active states).
 */
const MESSAGEABLE_STATUSES: AgentStatus[] = ["working", "waiting", "paused", "idle"];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter agents to only those that can receive messages.
 */
function getMessageableAgents(agents: AgentInfo[]): AgentInfo[] {
  return agents.filter((agent) => MESSAGEABLE_STATUSES.includes(agent.status));
}

/**
 * Get status description text.
 */
function getStatusDescription(status: AgentStatus): string {
  switch (status) {
    case "idle":
      return "Ready to receive instructions";
    case "working":
      return "Currently processing - message will be queued";
    case "waiting":
      return "Waiting for input";
    case "paused":
      return "Paused - will resume on message";
    case "error":
      return "In error state";
    case "completed":
      return "Task completed";
    default:
      return "";
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface HeaderProps {
  broadcastMode: boolean;
  onToggleBroadcast?: () => void;
  onClose: () => void;
}

/**
 * Overlay header with title and close button.
 */
function Header({ broadcastMode, onToggleBroadcast, onClose }: HeaderProps) {
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
        <text>
          <span fg="cyan">{STATUS_ICONS.arrowRight}</span>
        </text>
        <text>
          <span fg="cyan" bold>
            {broadcastMode ? "Broadcast to All Agents" : "Message Agent"}
          </span>
        </text>
      </box>

      {/* Right: Broadcast toggle and close */}
      <box flexDirection="row" gap={2}>
        {onToggleBroadcast && (
          <text>
            <span fg={broadcastMode ? "yellow" : "gray"}>
              [B] Broadcast: {broadcastMode ? "ON" : "OFF"}
            </span>
          </text>
        )}
        <text>
          <span fg="gray">[Esc] Close</span>
        </text>
      </box>
    </box>
  );
}

interface AgentListProps {
  agents: AgentInfo[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  focused: boolean;
  broadcastMode: boolean;
}

/**
 * Scrollable list of agents to select from.
 */
function AgentList({
  agents,
  selectedIndex,
  onSelect,
  focused,
  broadcastMode,
}: AgentListProps) {
  if (agents.length === 0) {
    return (
      <box padding={1}>
        <text>
          <span fg="gray">No agents available to message</span>
        </text>
      </box>
    );
  }

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={focused ? "cyan" : "gray"}
      marginLeft={1}
      marginRight={1}
      maxHeight={8}
      overflow="hidden"
    >
      {/* Header row */}
      <box flexDirection="row" paddingLeft={1} paddingRight={1} height={1}>
        <text>
          <span fg="gray" bold>
            {"  Agent".padEnd(20)}Status
          </span>
        </text>
      </box>

      {/* Agent rows */}
      {agents.map((agent, index) => {
        const isSelected = index === selectedIndex;
        const statusColor = getAgentStatusColor(agent.status);
        const statusIcon = getAgentStatusIcon(agent.status);

        return (
          <box key={agent.id} flexDirection="row" paddingLeft={1} paddingRight={1}>
            <text>
              <span fg={isSelected && focused ? "cyan" : "gray"}>
                {broadcastMode ? "[✓]" : isSelected ? " > " : "   "}
              </span>
              <span fg={isSelected && focused ? "cyan" : "white"}>
                {agent.name.padEnd(17)}
              </span>
              <span fg={statusColor}>
                {statusIcon} {agent.status}
              </span>
            </text>
          </box>
        );
      })}
    </box>
  );
}

interface AgentContextProps {
  agent: AgentInfo;
}

/**
 * Display selected agent's context.
 */
function AgentContext({ agent }: AgentContextProps) {
  const statusColor = getAgentStatusColor(agent.status);
  const statusDescription = getStatusDescription(agent.status);

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor="gray"
      marginLeft={1}
      marginRight={1}
      padding={1}
      gap={1}
    >
      {/* Agent info */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg="gray">Agent:</span>
        </text>
        <text>
          <span fg="white" bold>
            {agent.name}
          </span>
        </text>
        {agent.role && (
          <text>
            <span fg="gray">({agent.role})</span>
          </text>
        )}
      </box>

      {/* Status */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg="gray">Status:</span>
        </text>
        <text>
          <span fg={statusColor}>{agent.status}</span>
        </text>
        <text>
          <span fg="gray">- {statusDescription}</span>
        </text>
      </box>

      {/* Current context */}
      {agent.context && (
        <box flexDirection="column">
          <text>
            <span fg="gray">Current context:</span>
          </text>
          <text>
            <span fg="white">{agent.context}</span>
          </text>
        </box>
      )}
    </box>
  );
}

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  focused: boolean;
  placeholder?: string;
}

/**
 * Multi-line message input area.
 */
function MessageInput({ value, onChange, focused, placeholder }: MessageInputProps) {
  const displayValue = value || placeholder || "Type your message...";
  const showPlaceholder = !value;

  return (
    <box
      flexDirection="column"
      marginLeft={1}
      marginRight={1}
      gap={0}
    >
      {/* Label */}
      <box paddingBottom={0}>
        <text>
          <span fg={focused ? "cyan" : "gray"}>Your message:</span>
        </text>
      </box>

      {/* Input area */}
      <box
        borderStyle="single"
        borderColor={focused ? "cyan" : "gray"}
        padding={1}
        minHeight={4}
      >
        <text>
          <span fg={showPlaceholder ? "gray" : "white"}>{displayValue}</span>
          {focused && (
            <span fg="cyan">█</span>
          )}
        </text>
      </box>

      {/* Help text */}
      <box paddingTop={0}>
        <text>
          <span fg="gray">
            This message will be added to the agent's context.
          </span>
        </text>
      </box>
    </box>
  );
}

interface ActionBarProps {
  canSend: boolean;
  broadcastMode: boolean;
  selectedAgentName: string;
  onSend: () => void;
  onCancel: () => void;
}

/**
 * Action buttons at bottom of overlay.
 */
function ActionBar({
  canSend,
  broadcastMode,
  selectedAgentName,
  onSend,
  onCancel,
}: ActionBarProps) {
  const sendLabel = broadcastMode
    ? "Send to All Agents"
    : `Send & Resume ${selectedAgentName}`;

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
      {/* Cancel button */}
      <text>
        <span bg="gray" fg="white">
          {" Cancel "}
        </span>
      </text>

      {/* Send button */}
      <text>
        <span bg={canSend ? "cyan" : "gray"} fg={canSend ? "black" : "gray"}>
          {` ${sendLabel} `}
        </span>
      </text>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * MessageAgentOverlay Component
 *
 * Provides an interface for sending messages to agents:
 * - Select target agent from list
 * - View agent's current context
 * - Compose and send message
 * - Optional broadcast to all agents
 *
 * @example
 * ```tsx
 * <MessageAgentOverlay
 *   visible={showOverlay}
 *   agents={activeAgents}
 *   selectedAgentId="backend-engineer"
 *   onSend={(agentId, message) => {
 *     sendMessageToAgent(agentId, message);
 *   }}
 *   onClose={() => setShowOverlay(false)}
 *   enableBroadcast
 *   terminalWidth={120}
 *   terminalHeight={40}
 * />
 * ```
 */
export function MessageAgentOverlay({
  visible,
  agents,
  selectedAgentId,
  onSend,
  onClose,
  enableBroadcast = false,
  placeholder,
  terminalWidth = 120,
  terminalHeight = 40,
}: MessageAgentOverlayProps) {
  // Filter to messageable agents
  const messageableAgents = getMessageableAgents(agents);

  // Find initial selected index
  const initialIndex = selectedAgentId
    ? messageableAgents.findIndex((a) => a.id === selectedAgentId)
    : 0;

  // State
  const [state, setState] = useState<OverlayState>({
    selectedIndex: Math.max(0, initialIndex),
    message: "",
    broadcastMode: false,
    focus: "message", // Start with focus on message input
  });

  // Don't render if not visible
  if (!visible) {
    return null;
  }

  // Calculate dimensions
  const modalWidth = Math.floor(terminalWidth * 0.75);
  const modalHeight = Math.min(Math.floor(terminalHeight * 0.8), 25);
  const left = Math.floor((terminalWidth - modalWidth) / 2);
  const top = Math.floor((terminalHeight - modalHeight) / 2);

  // Get selected agent
  const selectedAgent = messageableAgents[state.selectedIndex];

  // Handlers
  const handleToggleBroadcast = () => {
    setState((prev) => ({ ...prev, broadcastMode: !prev.broadcastMode }));
  };

  const handleSelectAgent = (index: number) => {
    setState((prev) => ({ ...prev, selectedIndex: index }));
  };

  const handleMessageChange = (value: string) => {
    setState((prev) => ({ ...prev, message: value }));
  };

  const handleToggleFocus = () => {
    setState((prev) => ({
      ...prev,
      focus: prev.focus === "agents" ? "message" : "agents",
    }));
  };

  const handleSend = () => {
    if (!state.message.trim()) return;

    if (state.broadcastMode) {
      // Send to all messageable agents
      const agentIds = messageableAgents.map((a) => a.id);
      onSend(agentIds, state.message);
    } else if (selectedAgent) {
      // Send to selected agent
      onSend(selectedAgent.id, state.message);
    }
  };

  // Can send if we have a message and either broadcast mode or a selected agent
  const canSend =
    state.message.trim().length > 0 &&
    (state.broadcastMode || Boolean(selectedAgent));

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={modalWidth}
      height={modalHeight}
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
    >
      {/* Header */}
      <Header
        broadcastMode={state.broadcastMode}
        onToggleBroadcast={enableBroadcast ? handleToggleBroadcast : undefined}
        onClose={onClose}
      />

      {/* Divider */}
      <box height={1} borderTop={1} borderColor="cyan" />

      {/* Content area */}
      <box flexDirection="column" flexGrow={1} paddingTop={1}>
        {/* Agent selection (if multiple agents and not broadcast) */}
        {messageableAgents.length > 1 && !state.broadcastMode && (
          <AgentList
            agents={messageableAgents}
            selectedIndex={state.selectedIndex}
            onSelect={handleSelectAgent}
            focused={state.focus === "agents"}
            broadcastMode={state.broadcastMode}
          />
        )}

        {/* Selected agent context */}
        {selectedAgent && !state.broadcastMode && (
          <AgentContext agent={selectedAgent} />
        )}

        {/* Broadcast indicator */}
        {state.broadcastMode && (
          <box
            marginLeft={1}
            marginRight={1}
            padding={1}
            borderStyle="single"
            borderColor="yellow"
          >
            <text>
              <span fg="yellow">{STATUS_ICONS.warning}</span>
              <span fg="white">
                {" "}
                Message will be sent to all {messageableAgents.length} active
                agents
              </span>
            </text>
          </box>
        )}

        {/* Message input */}
        <MessageInput
          value={state.message}
          onChange={handleMessageChange}
          focused={state.focus === "message"}
          placeholder={placeholder}
        />
      </box>

      {/* Action bar */}
      <ActionBar
        canSend={canSend}
        broadcastMode={state.broadcastMode}
        selectedAgentName={selectedAgent?.name ?? "Agent"}
        onSend={handleSend}
        onCancel={onClose}
      />

      {/* Keyboard hints */}
      <box
        height={1}
        borderTop={1}
        borderColor="cyan"
        flexDirection="row"
        justifyContent="center"
        gap={2}
        paddingLeft={1}
        paddingRight={1}
      >
        <text>
          <span fg="gray">Tab: Switch focus</span>
        </text>
        {messageableAgents.length > 1 && !state.broadcastMode && (
          <text>
            <span fg="gray">↑↓: Select agent</span>
          </text>
        )}
        {enableBroadcast && (
          <text>
            <span fg="gray">B: Toggle broadcast</span>
          </text>
        )}
        <text>
          <span fg="gray">Enter: Send</span>
        </text>
        <text>
          <span fg="gray">Esc: Cancel</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Quick Message Component
// ============================================================================

/**
 * Props for QuickMessageInput.
 */
export interface QuickMessageInputProps {
  /** Agent to send message to */
  agent: AgentInfo;
  /** Callback when message is sent */
  onSend: (message: string) => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Current input value */
  value: string;
  /** Callback when input changes */
  onChange: (value: string) => void;
}

/**
 * Compact inline message input for quick agent messaging.
 *
 * Use this for embedding in agent panels or detail views.
 *
 * @example
 * ```tsx
 * <QuickMessageInput
 *   agent={selectedAgent}
 *   value={messageInput}
 *   onChange={setMessageInput}
 *   onSend={(msg) => sendToAgent(selectedAgent.id, msg)}
 *   onCancel={() => setShowInput(false)}
 * />
 * ```
 */
export function QuickMessageInput({
  agent,
  onSend,
  onCancel,
  value,
  onChange,
}: QuickMessageInputProps) {
  const statusColor = getAgentStatusColor(agent.status);

  const handleSubmit = () => {
    if (value.trim()) {
      onSend(value.trim());
    }
  };

  return (
    <box flexDirection="column" gap={0}>
      {/* Agent indicator */}
      <box flexDirection="row" gap={1} paddingLeft={1}>
        <text>
          <span fg="gray">To:</span>
        </text>
        <text>
          <span fg={statusColor}>{agent.name}</span>
        </text>
      </box>

      {/* Input row */}
      <box flexDirection="row" gap={1}>
        <box flexGrow={1} borderStyle="single" borderColor="cyan" paddingLeft={1}>
          <text>
            <span fg={value ? "white" : "gray"}>
              {value || "Type message..."}
            </span>
            <span fg="cyan">█</span>
          </text>
        </box>

        {/* Send button */}
        <text>
          <span bg={value ? "cyan" : "gray"} fg="black">
            {" Send "}
          </span>
        </text>
      </box>

      {/* Keyboard hints */}
      <box flexDirection="row" gap={2} paddingLeft={1}>
        <text>
          <span fg="gray">Enter: Send</span>
        </text>
        <text>
          <span fg="gray">Esc: Cancel</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default MessageAgentOverlay;
