/**
 * Common Type Definitions
 *
 * Shared types used across multiple entities in the domain layer.
 * These types provide consistency and reusability throughout the codebase.
 */

import { z } from "zod";

// ============================================================================
// Timestamp Types
// ============================================================================

/**
 * ISO 8601 date string type for serialization.
 */
export type ISODateString = string;

/**
 * Schema for validating ISO date strings.
 */
export const ISODateStringSchema = z.string().datetime();

/**
 * Schema for Date objects with transformation from strings.
 */
export const DateSchema = z.coerce.date();

// ============================================================================
// Model Types
// ============================================================================

/**
 * Claude model options.
 */
export const ModelSchema = z.enum(["sonnet", "opus", "haiku"]);
export type Model = z.infer<typeof ModelSchema>;

// ============================================================================
// Review Gate Types
// ============================================================================

/**
 * Review gate behavior options.
 * - pause: Pause workflow until human approves
 * - notify: Send notification but continue
 * - auto-approve: Automatically approve after criteria met or timeout
 */
export const ReviewGateBehaviorSchema = z.enum([
  "pause",
  "notify",
  "auto-approve",
]);
export type ReviewGateBehavior = z.infer<typeof ReviewGateBehaviorSchema>;

/**
 * Review gate configuration for workflow stages.
 */
export const ReviewGateSchema = z.object({
  /** Behavior when review gate is reached */
  behavior: ReviewGateBehaviorSchema,
  /** Automated approval criteria (for auto-approve) */
  criteria: z.array(z.string()).optional(),
  /** Timeout in milliseconds for auto-approve */
  timeout: z.number().positive().optional(),
});
export type ReviewGate = z.infer<typeof ReviewGateSchema>;

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Stage execution mode.
 * - sequential: Agents run one after another
 * - parallel: Agents run concurrently
 */
export const ExecutionModeSchema = z.enum(["sequential", "parallel"]);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

// ============================================================================
// Severity & Priority Types
// ============================================================================

/**
 * Issue severity levels.
 */
export const SeveritySchema = z.enum(["critical", "high", "medium", "low"]);
export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Priority levels.
 */
export const PrioritySchema = z.enum(["urgent", "high", "normal", "low"]);
export type Priority = z.infer<typeof PrioritySchema>;

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message role in a conversation.
 */
export const MessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * Conversation message structure.
 */
export const ConversationMessageSchema = z.object({
  /** Message role */
  role: MessageRoleSchema,
  /** Message content */
  content: z.string(),
  /** Timestamp of the message */
  timestamp: DateSchema,
  /** Optional metadata */
  metadata: z.record(z.unknown()).optional(),
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

// ============================================================================
// HTTP Method Types
// ============================================================================

/**
 * HTTP methods for API contracts.
 */
export const HttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

// ============================================================================
// Source Types
// ============================================================================

/**
 * Source origin for entities (skills, workflows, etc.).
 */
export const SourceTypeSchema = z.enum(["builtin", "custom", "imported"]);
export type SourceType = z.infer<typeof SourceTypeSchema>;

// ============================================================================
// Entity Timestamps
// ============================================================================

/**
 * Common timestamp fields for entities.
 */
export const EntityTimestampsSchema = z.object({
  /** When the entity was created */
  createdAt: DateSchema,
  /** When the entity was last updated */
  updatedAt: DateSchema,
});
export type EntityTimestamps = z.infer<typeof EntityTimestampsSchema>;

/**
 * Extended timestamps including last active.
 */
export const ExtendedTimestampsSchema = EntityTimestampsSchema.extend({
  /** When the entity was last active */
  lastActiveAt: DateSchema,
});
export type ExtendedTimestamps = z.infer<typeof ExtendedTimestampsSchema>;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Make specific properties optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required.
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Extract the type of array elements.
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Create a type with all properties set to a specific type.
 */
export type RecordOf<K extends string | number | symbol, V> = Record<K, V>;
