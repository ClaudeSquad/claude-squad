/**
 * Intervention Modal Component
 *
 * A specialized modal for handling agent intervention requests.
 * Supports different intervention types (question, approval, input, choice)
 * with appropriate UI for each, countdown timer, and response handling.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import {
  PRIMARY_COLORS,
  TEXT_COLORS,
  STATUS_ICONS,
  AGENT_STATUS_COLORS,
  AGENT_STATUS_ICONS,
  type TerminalColor,
} from "../theme/index.js";
import type {
  InterventionRequest,
  InterventionType,
} from "../../core/agent/types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the InterventionModal component.
 */
export interface InterventionModalProps {
  /** The intervention request to display */
  request: InterventionRequest;
  /** Callback when user responds to the intervention */
  onRespond: (requestId: string, response: string) => void;
  /** Callback when user cancels/dismisses the intervention */
  onCancel?: (requestId: string) => void;
  /** Optional agent name for display */
  agentName?: string;
  /** Timeout in milliseconds (default: from request or 5 minutes) */
  timeoutMs?: number;
  /** Terminal width for sizing */
  terminalWidth?: number;
  /** Terminal height for sizing */
  terminalHeight?: number;
}

/**
 * State for intervention response.
 */
interface ResponseState {
  /** Selected option index (for choice type) */
  selectedIndex: number;
  /** Custom text input value */
  textInput: string;
  /** Whether user is typing custom input */
  isTyping: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default timeout in milliseconds (5 minutes).
 */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Colors for intervention types.
 */
const TYPE_COLORS: Record<InterventionType, TerminalColor> = {
  question: "cyan",
  approval: "yellow",
  input: "blue",
  choice: "magenta",
};

/**
 * Icons for intervention types.
 */
const TYPE_ICONS: Record<InterventionType, string> = {
  question: "?",
  approval: STATUS_ICONS.warning,
  input: STATUS_ICONS.arrowRight,
  choice: STATUS_ICONS.bullet,
};

/**
 * Labels for intervention types.
 */
const TYPE_LABELS: Record<InterventionType, string> = {
  question: "Question",
  approval: "Approval Required",
  input: "Input Required",
  choice: "Choose an Option",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format milliseconds as MM:SS countdown.
 */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Get countdown color based on remaining time.
 */
function getCountdownColor(remainingMs: number, totalMs: number): TerminalColor {
  const ratio = remainingMs / totalMs;
  if (ratio <= 0.1) return "red";
  if (ratio <= 0.25) return "yellow";
  return "gray";
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for countdown timer.
 */
function useCountdown(
  timeoutMs: number,
  onTimeout: () => void
): { remaining: number; isExpired: boolean } {
  const [remaining, setRemaining] = useState(timeoutMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset countdown when timeoutMs changes
    setRemaining(timeoutMs);

    // Start countdown interval
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          onTimeout();
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeoutMs, onTimeout]);

  return {
    remaining,
    isExpired: remaining <= 0,
  };
}

// ============================================================================
// Sub-components
// ============================================================================

interface HeaderProps {
  type: InterventionType;
  agentName?: string;
  remaining: number;
  timeoutMs: number;
}

/**
 * Modal header with agent info and countdown.
 */
function Header({ type, agentName, remaining, timeoutMs }: HeaderProps) {
  const typeColor = TYPE_COLORS[type];
  const typeIcon = TYPE_ICONS[type];
  const typeLabel = TYPE_LABELS[type];
  const countdownColor = getCountdownColor(remaining, timeoutMs);

  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      height={1}
    >
      {/* Left: Type and agent */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg={typeColor}>{typeIcon}</span>
        </text>
        <text>
          <span fg={typeColor} bold>
            {typeLabel}
          </span>
        </text>
        {agentName && (
          <text>
            <span fg="gray">from </span>
            <span fg="white">{agentName}</span>
          </text>
        )}
      </box>

      {/* Right: Countdown */}
      <box flexDirection="row" gap={1}>
        <text>
          <span fg={countdownColor}>
            {STATUS_ICONS.spinner[0]} {formatCountdown(remaining)}
          </span>
        </text>
      </box>
    </box>
  );
}

interface PromptSectionProps {
  prompt: string;
  context?: string;
}

/**
 * Display the intervention prompt and context.
 */
function PromptSection({ prompt, context }: PromptSectionProps) {
  return (
    <box flexDirection="column" gap={1} paddingTop={1} paddingBottom={1}>
      {/* Context (if available) */}
      {context && (
        <box borderStyle="single" borderColor="gray" padding={1}>
          <text>
            <span fg="gray">{context}</span>
          </text>
        </box>
      )}

      {/* Main prompt */}
      <box paddingLeft={1} paddingRight={1}>
        <text>
          <span fg="white">{prompt}</span>
        </text>
      </box>
    </box>
  );
}

interface ChoiceListProps {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/**
 * Numbered choice list with selection indicator.
 */
function ChoiceList({ options, selectedIndex, onSelect }: ChoiceListProps) {
  return (
    <box
      flexDirection="column"
      gap={0}
      borderStyle="single"
      borderColor="gray"
      marginLeft={1}
      marginRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      {options.map((option, index) => {
        const isSelected = index === selectedIndex;
        return (
          <box key={index} flexDirection="row" paddingLeft={1} paddingRight={1}>
            <text>
              <span fg={isSelected ? "cyan" : "gray"}>
                {isSelected ? ">" : " "}
              </span>
              <span fg={isSelected ? "cyan" : "white"}>
                {" "}
                {index + 1}. {option}
              </span>
            </text>
          </box>
        );
      })}
    </box>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}

/**
 * Text input field for custom responses.
 */
function TextInput({ value, placeholder, multiline }: TextInputProps) {
  const displayValue = value || placeholder || "Type your response...";
  const showPlaceholder = !value;

  return (
    <box
      borderStyle="single"
      borderColor={showPlaceholder ? "gray" : "cyan"}
      marginLeft={1}
      marginRight={1}
      padding={1}
      minHeight={multiline ? 3 : 1}
    >
      <text>
        <span fg={showPlaceholder ? "gray" : "white"}>{displayValue}</span>
        <span fg="cyan">█</span>
      </text>
    </box>
  );
}

interface ApprovalButtonsProps {
  onApprove: () => void;
  onReject: () => void;
}

/**
 * Approve/Reject button pair for approval interventions.
 */
function ApprovalButtons({ onApprove, onReject }: ApprovalButtonsProps) {
  return (
    <box flexDirection="row" justifyContent="center" gap={4} paddingTop={1}>
      {/* Reject button */}
      <text>
        <span bg="red" fg="white">
          {" [R] Reject "}
        </span>
      </text>

      {/* Approve button */}
      <text>
        <span bg="green" fg="black">
          {" [A] Approve "}
        </span>
      </text>
    </box>
  );
}

interface ActionBarProps {
  type: InterventionType;
  hasCustomInput: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  onToggleInput?: () => void;
  canSubmit: boolean;
}

/**
 * Action buttons bar at bottom of modal.
 */
function ActionBar({
  type,
  hasCustomInput,
  onSubmit,
  onCancel,
  onToggleInput,
  canSubmit,
}: ActionBarProps) {
  return (
    <box
      flexDirection="row"
      justifyContent="space-between"
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      height={2}
    >
      {/* Left: Cancel */}
      <text>
        <span fg="gray">[Esc] Cancel</span>
      </text>

      {/* Center: Toggle custom input (for choice type) */}
      {type === "choice" && onToggleInput && (
        <text>
          <span fg="gray">
            [T] {hasCustomInput ? "Show Options" : "Custom Input"}
          </span>
        </text>
      )}

      {/* Right: Submit */}
      <text>
        <span fg={canSubmit ? "cyan" : "gray"}>
          [Enter] {type === "approval" ? "Approve" : "Submit"}
        </span>
      </text>
    </box>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * InterventionModal Component
 *
 * Displays an agent intervention request with type-specific UI:
 * - Question: Text input field
 * - Approval: Approve/Reject buttons
 * - Input: Text input field
 * - Choice: Selectable options list with optional custom input
 *
 * Features countdown timer and keyboard navigation.
 *
 * @example
 * ```tsx
 * <InterventionModal
 *   request={pendingRequest}
 *   agentName="backend-engineer"
 *   onRespond={(id, response) => {
 *     handler.respond(id, response);
 *   }}
 *   onCancel={(id) => {
 *     handler.cancel(id);
 *   }}
 *   terminalWidth={120}
 *   terminalHeight={40}
 * />
 * ```
 */
export function InterventionModal({
  request,
  onRespond,
  onCancel,
  agentName,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  terminalWidth = 120,
  terminalHeight = 40,
}: InterventionModalProps) {
  // Response state
  const [state, setState] = useState<ResponseState>({
    selectedIndex: 0,
    textInput: "",
    isTyping: request.type === "input" || request.type === "question",
  });

  // Countdown timer
  const handleTimeout = useCallback(() => {
    onCancel?.(request.id);
  }, [onCancel, request.id]);

  const { remaining, isExpired } = useCountdown(timeoutMs, handleTimeout);

  // Don't render if expired
  if (isExpired || request.status !== "pending") {
    return null;
  }

  // Calculate modal dimensions
  const modalWidth = Math.floor(terminalWidth * 0.7);
  const modalHeight = Math.min(
    Math.floor(terminalHeight * 0.7),
    15 + (request.options?.length ?? 0)
  );
  const left = Math.floor((terminalWidth - modalWidth) / 2);
  const top = Math.floor((terminalHeight - modalHeight) / 2);

  // Handlers
  const handleSubmit = () => {
    let response: string;

    if (request.type === "choice") {
      if (state.isTyping) {
        response = state.textInput;
      } else if (request.options && request.options[state.selectedIndex]) {
        response = request.options[state.selectedIndex];
      } else {
        return; // No valid response
      }
    } else if (request.type === "approval") {
      response = "approve";
    } else {
      response = state.textInput;
    }

    if (response) {
      onRespond(request.id, response);
    }
  };

  const handleReject = () => {
    if (request.type === "approval") {
      onRespond(request.id, "reject");
    }
  };

  const handleCancel = () => {
    onCancel?.(request.id);
  };

  const handleToggleInput = () => {
    setState((prev) => ({ ...prev, isTyping: !prev.isTyping }));
  };

  const handleSelectOption = (index: number) => {
    setState((prev) => ({ ...prev, selectedIndex: index }));
  };

  const handleTextChange = (value: string) => {
    setState((prev) => ({ ...prev, textInput: value }));
  };

  // Determine if submit is enabled
  const canSubmit =
    request.type === "approval" ||
    (state.isTyping && state.textInput.length > 0) ||
    (!state.isTyping && request.options && request.options.length > 0);

  // Get border color based on type
  const borderColor = TYPE_COLORS[request.type];

  return (
    <box
      position="absolute"
      left={left}
      top={top}
      width={modalWidth}
      height={modalHeight}
      flexDirection="column"
      borderStyle="double"
      borderColor={borderColor}
    >
      {/* Header */}
      <Header
        type={request.type}
        agentName={agentName}
        remaining={remaining}
        timeoutMs={timeoutMs}
      />

      {/* Divider */}
      <box height={1} borderTop={1} borderColor={borderColor} />

      {/* Prompt */}
      <PromptSection prompt={request.prompt} context={request.context} />

      {/* Type-specific content */}
      <box flexDirection="column" flexGrow={1}>
        {request.type === "choice" && !state.isTyping && request.options && (
          <ChoiceList
            options={request.options}
            selectedIndex={state.selectedIndex}
            onSelect={handleSelectOption}
          />
        )}

        {request.type === "approval" && (
          <ApprovalButtons onApprove={handleSubmit} onReject={handleReject} />
        )}

        {(request.type === "question" ||
          request.type === "input" ||
          (request.type === "choice" && state.isTyping)) && (
          <TextInput
            value={state.textInput}
            onChange={handleTextChange}
            placeholder={
              request.type === "choice"
                ? "Enter custom option..."
                : "Type your response..."
            }
          />
        )}
      </box>

      {/* Action bar */}
      <ActionBar
        type={request.type}
        hasCustomInput={state.isTyping}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onToggleInput={request.type === "choice" ? handleToggleInput : undefined}
        canSubmit={Boolean(canSubmit)}
      />

      {/* Keyboard hints */}
      <box
        height={1}
        borderTop={1}
        borderColor={borderColor}
        flexDirection="row"
        justifyContent="center"
        gap={2}
      >
        {request.type === "choice" && !state.isTyping && (
          <text>
            <span fg="gray">↑↓: Navigate</span>
          </text>
        )}
        {request.type === "approval" && (
          <>
            <text>
              <span fg="green">A: Approve</span>
            </text>
            <text>
              <span fg="red">R: Reject</span>
            </text>
          </>
        )}
        <text>
          <span fg="gray">Enter: Submit</span>
        </text>
        <text>
          <span fg="gray">Esc: Cancel</span>
        </text>
      </box>
    </box>
  );
}

// ============================================================================
// Container Component
// ============================================================================

/**
 * Props for InterventionContainer.
 */
export interface InterventionContainerProps {
  /** Array of pending intervention requests */
  requests: InterventionRequest[];
  /** Callback when user responds to an intervention */
  onRespond: (requestId: string, response: string) => void;
  /** Callback when user cancels an intervention */
  onCancel?: (requestId: string) => void;
  /** Function to get agent name by ID */
  getAgentName?: (agentId: string) => string | undefined;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Terminal dimensions */
  terminalWidth?: number;
  terminalHeight?: number;
}

/**
 * Container that displays the first pending intervention.
 *
 * Use this component to integrate with InterventionHandler's intervention$ observable.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [requests, setRequests] = useState<InterventionRequest[]>([]);
 *
 *   useEffect(() => {
 *     const sub = handler.intervention$.subscribe(({ request }) => {
 *       if (request.status === 'pending') {
 *         setRequests(prev => [...prev, request]);
 *       } else {
 *         setRequests(prev => prev.filter(r => r.id !== request.id));
 *       }
 *     });
 *     return () => sub.unsubscribe();
 *   }, []);
 *
 *   return (
 *     <InterventionContainer
 *       requests={requests}
 *       onRespond={(id, response) => handler.respond(id, response)}
 *       onCancel={(id) => handler.cancel(id)}
 *     />
 *   );
 * }
 * ```
 */
export function InterventionContainer({
  requests,
  onRespond,
  onCancel,
  getAgentName,
  timeoutMs,
  terminalWidth,
  terminalHeight,
}: InterventionContainerProps) {
  // Get the first pending request
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const currentRequest = pendingRequests[0];

  if (!currentRequest) {
    return null;
  }

  // Get agent name if available
  const agentName = getAgentName?.(currentRequest.agentId);

  // Show queue indicator if multiple pending
  const queueCount = pendingRequests.length;

  return (
    <box flexDirection="column">
      {/* Modal for current request */}
      <InterventionModal
        request={currentRequest}
        onRespond={onRespond}
        onCancel={onCancel}
        agentName={agentName}
        timeoutMs={timeoutMs}
        terminalWidth={terminalWidth}
        terminalHeight={terminalHeight}
      />

      {/* Queue indicator */}
      {queueCount > 1 && (
        <box
          position="absolute"
          bottom={2}
          left={Math.floor((terminalWidth ?? 120) / 2) - 15}
          width={30}
        >
          <text>
            <span fg="gray">
              +{queueCount - 1} more intervention{queueCount > 2 ? "s" : ""}{" "}
              waiting
            </span>
          </text>
        </box>
      )}
    </box>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default InterventionModal;
