/**
 * Session Entity
 *
 * Represents an active development session in Claude Squad.
 * Sessions track conversation history, command history, and
 * coordinate agent activities for a project.
 */

import { z } from "zod";
import type { SessionId, FeatureId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema, ConversationMessageSchema } from "../types/common";

// ============================================================================
// Session Status
// ============================================================================

/**
 * Session lifecycle states.
 */
export const SessionStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "archived",
  "crashed",
]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

/**
 * Status descriptions for UI display.
 */
export const SESSION_STATUS_DESCRIPTIONS: Record<SessionStatus, string> = {
  active: "Session is currently active",
  paused: "Session has been paused",
  completed: "Session has been completed successfully",
  archived: "Session has been archived for reference",
  crashed: "Session crashed unexpectedly",
};

/**
 * Terminal states that cannot transition to other states (except archived).
 */
export const SESSION_TERMINAL_STATES: SessionStatus[] = ["archived"];

// ============================================================================
// Session Entity
// ============================================================================

/**
 * ID validation patterns.
 */
const SessionIdPattern = createIdPattern("ses");
const FeatureIdPattern = createIdPattern("ftr");

/**
 * Session entity schema.
 */
export const SessionSchema = z.object({
  /** Unique session identifier */
  id: z.string().regex(SessionIdPattern, "Invalid SessionId format"),
  /** Session name */
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  /** Associated feature ID */
  featureId: z.string().regex(FeatureIdPattern, "Invalid FeatureId format").optional(),
  /** Current session state */
  status: SessionStatusSchema.default("active"),
  /** Number of agents spawned */
  agentCount: z.number().int().nonnegative().default(0),
  /** Project directory path */
  projectPath: z.string().min(1, "Project path is required"),
  /** Conversation history */
  conversationHistory: z.array(ConversationMessageSchema).default([]),
  /** Command history */
  commandHistory: z.array(z.string()).default([]),
  /** Total API cost for this session */
  totalCost: z.number().nonnegative().default(0),
  /** Total tokens used */
  totalTokens: z
    .object({
      input: z.number().int().nonnegative().default(0),
      output: z.number().int().nonnegative().default(0),
    })
    .default({ input: 0, output: 0 }),
  /** Session configuration overrides */
  config: z
    .object({
      model: z.enum(["sonnet", "opus", "haiku"]).optional(),
      maxConcurrentAgents: z.number().int().positive().optional(),
    })
    .default({}),
  /** Error message if crashed */
  errorMessage: z.string().optional(),
  /** Stack trace if crashed */
  errorStack: z.string().optional(),
  /** Creation timestamp */
  createdAt: DateSchema,
  /** Last update timestamp */
  updatedAt: DateSchema,
  /** Last activity timestamp */
  lastActiveAt: DateSchema,
});

/**
 * Session entity type.
 */
export type Session = z.infer<typeof SessionSchema>;

/**
 * Typed Session with branded IDs.
 */
export interface TypedSession extends Omit<Session, "id" | "featureId"> {
  id: SessionId;
  featureId?: FeatureId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial session schema for updates.
 */
export const PartialSessionSchema = SessionSchema.partial();
export type PartialSession = z.infer<typeof PartialSessionSchema>;

/**
 * Schema for creating a new session.
 */
export const CreateSessionSchema = SessionSchema.omit({
  createdAt: true,
  updatedAt: true,
  lastActiveAt: true,
}).extend({
  createdAt: DateSchema.optional(),
  updatedAt: DateSchema.optional(),
  lastActiveAt: DateSchema.optional(),
});
export type CreateSession = z.infer<typeof CreateSessionSchema>;

/**
 * Schema for updating an existing session.
 */
export const UpdateSessionSchema = SessionSchema.partial().omit({
  id: true,
  createdAt: true,
}).extend({
  updatedAt: DateSchema.optional(),
  lastActiveAt: DateSchema.optional(),
});
export type UpdateSession = z.infer<typeof UpdateSessionSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate session data.
 * @throws ZodError if validation fails
 */
export function validateSession(data: unknown): Session {
  return SessionSchema.parse(data);
}

/**
 * Safely validate session data.
 */
export function safeValidateSession(data: unknown): {
  success: boolean;
  data?: Session;
  error?: z.ZodError;
} {
  const result = SessionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new session with defaults.
 */
export function createSession(
  data: Pick<CreateSession, "id" | "name" | "projectPath"> &
    Partial<Omit<CreateSession, "id" | "name" | "projectPath">>
): Session {
  const now = new Date();
  return SessionSchema.parse({
    ...data,
    status: data.status ?? "active",
    agentCount: data.agentCount ?? 0,
    conversationHistory: data.conversationHistory ?? [],
    commandHistory: data.commandHistory ?? [],
    totalCost: data.totalCost ?? 0,
    totalTokens: data.totalTokens ?? { input: 0, output: 0 },
    config: data.config ?? {},
    createdAt: now,
    updatedAt: now,
    lastActiveAt: now,
  });
}

/**
 * Update a session with new data.
 */
export function updateSession(session: Session, updates: UpdateSession): Session {
  const now = new Date();
  return SessionSchema.parse({
    ...session,
    ...updates,
    updatedAt: now,
    lastActiveAt: updates.lastActiveAt ?? now,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a session status is terminal.
 */
export function isSessionTerminal(status: SessionStatus): boolean {
  return SESSION_TERMINAL_STATES.includes(status);
}

/**
 * Add a message to conversation history.
 */
export function addConversationMessage(
  session: Session,
  role: "user" | "assistant" | "system",
  content: string
): Session {
  const message = {
    role,
    content,
    timestamp: new Date(),
  };
  return updateSession(session, {
    conversationHistory: [...session.conversationHistory, message],
  });
}

/**
 * Add a command to command history.
 */
export function addCommandToHistory(session: Session, command: string): Session {
  return updateSession(session, {
    commandHistory: [...session.commandHistory, command],
  });
}

/**
 * Update session cost tracking.
 */
export function updateSessionCost(
  session: Session,
  cost: number,
  tokens: { input: number; output: number }
): Session {
  return updateSession(session, {
    totalCost: session.totalCost + cost,
    totalTokens: {
      input: session.totalTokens.input + tokens.input,
      output: session.totalTokens.output + tokens.output,
    },
  });
}

/**
 * Get the session duration in milliseconds.
 */
export function getSessionDuration(session: Session): number {
  return session.lastActiveAt.getTime() - session.createdAt.getTime();
}

/**
 * Check if session is active.
 */
export function isSessionActive(session: Session): boolean {
  return session.status === "active";
}

/**
 * Mark session as crashed with error details.
 */
export function markSessionCrashed(
  session: Session,
  error: Error | string
): Session {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorStack = typeof error === "string" ? undefined : error.stack;
  return updateSession(session, {
    status: "crashed",
    errorMessage,
    errorStack,
  });
}
