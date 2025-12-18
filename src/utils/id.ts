/**
 * ID Generation Utilities
 *
 * Provides type-safe ID generation using nanoid.
 * Uses branded types for compile-time safety.
 */

import { nanoid, customAlphabet } from "nanoid";

/**
 * Brand interface for type-safe IDs
 */
declare const brand: unique symbol;

/**
 * Branded type for IDs
 */
export type BrandedId<T extends string> = string & { readonly [brand]: T };

/**
 * Session ID type
 */
export type SessionId = BrandedId<"SessionId">;

/**
 * Agent ID type
 */
export type AgentId = BrandedId<"AgentId">;

/**
 * Feature ID type
 */
export type FeatureId = BrandedId<"FeatureId">;

/**
 * Workflow ID type
 */
export type WorkflowId = BrandedId<"WorkflowId">;

/**
 * Skill ID type
 */
export type SkillId = BrandedId<"SkillId">;

/**
 * Worktree ID type
 */
export type WorktreeId = BrandedId<"WorktreeId">;

/**
 * Handoff ID type
 */
export type HandoffId = BrandedId<"HandoffId">;

/**
 * Default ID length
 */
const DEFAULT_ID_LENGTH = 12;

/**
 * Short ID length (for display purposes)
 */
const SHORT_ID_LENGTH = 8;

/**
 * Custom alphabet for URL-safe, readable IDs
 * Excludes similar-looking characters (0, O, I, l)
 */
const READABLE_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

/**
 * Numeric-only alphabet for certain IDs
 */
const NUMERIC_ALPHABET = "0123456789";

/**
 * Custom nanoid generators
 */
const readableNanoid = customAlphabet(READABLE_ALPHABET, DEFAULT_ID_LENGTH);
const shortNanoid = customAlphabet(READABLE_ALPHABET, SHORT_ID_LENGTH);
const numericNanoid = customAlphabet(NUMERIC_ALPHABET, 6);

/**
 * Generate a session ID
 */
export function generateSessionId(): SessionId {
  return `ses_${readableNanoid()}` as SessionId;
}

/**
 * Generate an agent ID
 */
export function generateAgentId(): AgentId {
  return `agt_${readableNanoid()}` as AgentId;
}

/**
 * Generate a feature ID
 */
export function generateFeatureId(): FeatureId {
  return `ftr_${readableNanoid()}` as FeatureId;
}

/**
 * Generate a workflow ID
 */
export function generateWorkflowId(): WorkflowId {
  return `wfl_${readableNanoid()}` as WorkflowId;
}

/**
 * Generate a skill ID
 */
export function generateSkillId(): SkillId {
  return `skl_${readableNanoid()}` as SkillId;
}

/**
 * Generate a worktree ID
 */
export function generateWorktreeId(): WorktreeId {
  return `wkt_${readableNanoid()}` as WorktreeId;
}

/**
 * Generate a handoff ID
 */
export function generateHandoffId(): HandoffId {
  return `hnd_${readableNanoid()}` as HandoffId;
}

/**
 * Generate a generic unique ID
 */
export function generateId(length: number = DEFAULT_ID_LENGTH): string {
  return nanoid(length);
}

/**
 * Generate a short ID for display purposes
 */
export function generateShortId(): string {
  return shortNanoid();
}

/**
 * Generate a numeric ID (e.g., for reference numbers)
 */
export function generateNumericId(): string {
  return numericNanoid();
}

/**
 * Extract the prefix from a branded ID
 */
export function getIdPrefix(id: string): string {
  const match = id.match(/^([a-z]+)_/);
  return match?.[1] ?? "";
}

/**
 * Validate that a string is a valid ID format
 */
export function isValidId(id: string, expectedPrefix?: string): boolean {
  if (!id || typeof id !== "string") return false;

  // Check for prefix format
  const match = id.match(/^([a-z]+)_([A-Za-z0-9]+)$/);
  if (!match) return false;

  if (expectedPrefix && match[1] !== expectedPrefix) return false;

  return true;
}

/**
 * Type guard for SessionId
 */
export function isSessionId(id: string): id is SessionId {
  return isValidId(id, "ses");
}

/**
 * Type guard for AgentId
 */
export function isAgentId(id: string): id is AgentId {
  return isValidId(id, "agt");
}

/**
 * Type guard for FeatureId
 */
export function isFeatureId(id: string): id is FeatureId {
  return isValidId(id, "ftr");
}

/**
 * Type guard for WorkflowId
 */
export function isWorkflowId(id: string): id is WorkflowId {
  return isValidId(id, "wfl");
}

/**
 * Type guard for SkillId
 */
export function isSkillId(id: string): id is SkillId {
  return isValidId(id, "skl");
}
