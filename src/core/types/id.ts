/**
 * Branded ID Types
 *
 * Type-safe, branded identifier types to prevent ID mixing across entity types.
 * Uses nanoid for generation with prefixed format for readability.
 *
 * @example
 * const sessionId = generateSessionId(); // "ses_abc123xyz456"
 * const agentId = generateAgentId();     // "agt_def789uvw012"
 *
 * // TypeScript prevents mixing:
 * function processAgent(id: AgentId) { ... }
 * processAgent(sessionId); // ❌ Type error!
 */

import { nanoid, customAlphabet } from "nanoid";

// ============================================================================
// Brand Symbol & Base Types
// ============================================================================

/**
 * Unique symbol for branding types.
 * This creates nominal typing in TypeScript's structural type system.
 */
declare const brand: unique symbol;

/**
 * Generic branded ID type.
 * The brand parameter creates a unique type for each ID kind.
 */
export type BrandedId<T extends string> = string & { readonly [brand]: T };

// ============================================================================
// ID Type Definitions
// ============================================================================

/** Unique session identifier */
export type SessionId = BrandedId<"SessionId">;

/** Agent instance identifier */
export type AgentId = BrandedId<"AgentId">;

/** Feature/task identifier */
export type FeatureId = BrandedId<"FeatureId">;

/** Skill template identifier */
export type SkillId = BrandedId<"SkillId">;

/** Workflow template identifier */
export type WorkflowId = BrandedId<"WorkflowId">;

/** Git worktree identifier */
export type WorktreeId = BrandedId<"WorktreeId">;

/** Workflow stage identifier */
export type StageId = BrandedId<"StageId">;

/** Handoff record identifier */
export type HandoffId = BrandedId<"HandoffId">;

/** Integration configuration identifier */
export type IntegrationId = BrandedId<"IntegrationId">;

// ============================================================================
// ID Generation Configuration
// ============================================================================

/** Default ID length (12 characters after prefix) */
const DEFAULT_ID_LENGTH = 12;

/** Short ID length for display purposes */
const SHORT_ID_LENGTH = 8;

/**
 * Custom alphabet for URL-safe, readable IDs.
 * Excludes similar-looking characters: 0, O, I, l
 */
const READABLE_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";

/** Numeric-only alphabet for reference numbers */
const NUMERIC_ALPHABET = "0123456789";

// ============================================================================
// Custom Nanoid Generators
// ============================================================================

const readableNanoid = customAlphabet(READABLE_ALPHABET, DEFAULT_ID_LENGTH);
const shortNanoid = customAlphabet(READABLE_ALPHABET, SHORT_ID_LENGTH);
const numericNanoid = customAlphabet(NUMERIC_ALPHABET, 6);

// ============================================================================
// ID Generation Functions
// ============================================================================

/**
 * Generate a unique session ID.
 * Format: ses_<12-char-nanoid>
 */
export function generateSessionId(): SessionId {
  return `ses_${readableNanoid()}` as SessionId;
}

/**
 * Generate a unique agent ID.
 * Format: agt_<12-char-nanoid>
 */
export function generateAgentId(): AgentId {
  return `agt_${readableNanoid()}` as AgentId;
}

/**
 * Generate a unique feature ID.
 * Format: ftr_<12-char-nanoid>
 */
export function generateFeatureId(): FeatureId {
  return `ftr_${readableNanoid()}` as FeatureId;
}

/**
 * Generate a unique workflow ID.
 * Format: wfl_<12-char-nanoid>
 */
export function generateWorkflowId(): WorkflowId {
  return `wfl_${readableNanoid()}` as WorkflowId;
}

/**
 * Generate a unique skill ID.
 * Format: skl_<12-char-nanoid>
 */
export function generateSkillId(): SkillId {
  return `skl_${readableNanoid()}` as SkillId;
}

/**
 * Generate a unique worktree ID.
 * Format: wkt_<12-char-nanoid>
 */
export function generateWorktreeId(): WorktreeId {
  return `wkt_${readableNanoid()}` as WorktreeId;
}

/**
 * Generate a unique stage ID.
 * Format: stg_<12-char-nanoid>
 */
export function generateStageId(): StageId {
  return `stg_${readableNanoid()}` as StageId;
}

/**
 * Generate a unique handoff ID.
 * Format: hnd_<12-char-nanoid>
 */
export function generateHandoffId(): HandoffId {
  return `hnd_${readableNanoid()}` as HandoffId;
}

/**
 * Generate a unique integration ID.
 * Format: int_<12-char-nanoid>
 */
export function generateIntegrationId(): IntegrationId {
  return `int_${readableNanoid()}` as IntegrationId;
}

/**
 * Generate a generic unique ID without prefix.
 */
export function generateId(length: number = DEFAULT_ID_LENGTH): string {
  return nanoid(length);
}

/**
 * Generate a short ID for display purposes.
 */
export function generateShortId(): string {
  return shortNanoid();
}

/**
 * Generate a numeric ID (e.g., for reference numbers).
 */
export function generateNumericId(): string {
  return numericNanoid();
}

// ============================================================================
// ID Validation & Utilities
// ============================================================================

/** Map of ID prefixes to their expected types */
export const ID_PREFIXES = {
  ses: "SessionId",
  agt: "AgentId",
  ftr: "FeatureId",
  skl: "SkillId",
  wfl: "WorkflowId",
  wkt: "WorktreeId",
  stg: "StageId",
  hnd: "HandoffId",
  int: "IntegrationId",
} as const;

export type IdPrefix = keyof typeof ID_PREFIXES;

/**
 * Extract the prefix from a branded ID.
 */
export function getIdPrefix(id: string): string {
  const match = id.match(/^([a-z]+)_/);
  return match?.[1] ?? "";
}

/**
 * Validate that a string matches the expected ID format.
 * Format: <prefix>_<alphanumeric-chars>
 */
export function isValidId(id: string, expectedPrefix?: string): boolean {
  if (!id || typeof id !== "string") return false;

  const match = id.match(/^([a-z]+)_([A-Za-z0-9]+)$/);
  if (!match) return false;

  if (expectedPrefix && match[1] !== expectedPrefix) return false;

  return true;
}

/**
 * Create a regex pattern for validating IDs with a specific prefix.
 */
export function createIdPattern(prefix: string): RegExp {
  return new RegExp(`^${prefix}_[A-Za-z0-9]+$`);
}

// ============================================================================
// Type Guards
// ============================================================================

/** Type guard for SessionId */
export function isSessionId(id: string): id is SessionId {
  return isValidId(id, "ses");
}

/** Type guard for AgentId */
export function isAgentId(id: string): id is AgentId {
  return isValidId(id, "agt");
}

/** Type guard for FeatureId */
export function isFeatureId(id: string): id is FeatureId {
  return isValidId(id, "ftr");
}

/** Type guard for WorkflowId */
export function isWorkflowId(id: string): id is WorkflowId {
  return isValidId(id, "wfl");
}

/** Type guard for SkillId */
export function isSkillId(id: string): id is SkillId {
  return isValidId(id, "skl");
}

/** Type guard for WorktreeId */
export function isWorktreeId(id: string): id is WorktreeId {
  return isValidId(id, "wkt");
}

/** Type guard for StageId */
export function isStageId(id: string): id is StageId {
  return isValidId(id, "stg");
}

/** Type guard for HandoffId */
export function isHandoffId(id: string): id is HandoffId {
  return isValidId(id, "hnd");
}

/** Type guard for IntegrationId */
export function isIntegrationId(id: string): id is IntegrationId {
  return isValidId(id, "int");
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Safely cast a string to a SessionId after validation.
 * @throws Error if the string is not a valid SessionId
 */
export function toSessionId(id: string): SessionId {
  if (!isSessionId(id)) {
    throw new Error(`Invalid SessionId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to an AgentId after validation.
 * @throws Error if the string is not a valid AgentId
 */
export function toAgentId(id: string): AgentId {
  if (!isAgentId(id)) {
    throw new Error(`Invalid AgentId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to a FeatureId after validation.
 * @throws Error if the string is not a valid FeatureId
 */
export function toFeatureId(id: string): FeatureId {
  if (!isFeatureId(id)) {
    throw new Error(`Invalid FeatureId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to a WorkflowId after validation.
 * @throws Error if the string is not a valid WorkflowId
 */
export function toWorkflowId(id: string): WorkflowId {
  if (!isWorkflowId(id)) {
    throw new Error(`Invalid WorkflowId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to a SkillId after validation.
 * @throws Error if the string is not a valid SkillId
 */
export function toSkillId(id: string): SkillId {
  if (!isSkillId(id)) {
    throw new Error(`Invalid SkillId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to a WorktreeId after validation.
 * @throws Error if the string is not a valid WorktreeId
 */
export function toWorktreeId(id: string): WorktreeId {
  if (!isWorktreeId(id)) {
    throw new Error(`Invalid WorktreeId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to a StageId after validation.
 * @throws Error if the string is not a valid StageId
 */
export function toStageId(id: string): StageId {
  if (!isStageId(id)) {
    throw new Error(`Invalid StageId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to a HandoffId after validation.
 * @throws Error if the string is not a valid HandoffId
 */
export function toHandoffId(id: string): HandoffId {
  if (!isHandoffId(id)) {
    throw new Error(`Invalid HandoffId format: ${id}`);
  }
  return id;
}

/**
 * Safely cast a string to an IntegrationId after validation.
 * @throws Error if the string is not a valid IntegrationId
 */
export function toIntegrationId(id: string): IntegrationId {
  if (!isIntegrationId(id)) {
    throw new Error(`Invalid IntegrationId format: ${id}`);
  }
  return id;
}
