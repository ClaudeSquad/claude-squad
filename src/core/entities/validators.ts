/**
 * Entity Validators
 *
 * Centralized validation utilities for all entity types.
 * Provides both throwing and safe validation functions.
 */

import { z } from "zod";
import { AgentSchema, type Agent } from "./agent";
import { FeatureSchema, type Feature } from "./feature";
import { SkillSchema, type Skill } from "./skill";
import { WorkflowSchema, type Workflow } from "./workflow";
import { StageSchema, type Stage } from "./stage";
import { SessionSchema, type Session } from "./session";
import { WorktreeSchema, type Worktree } from "./worktree";
import { HandoffSchema, type Handoff } from "./handoff";
import { IntegrationSchema, type Integration } from "./integration";

// ============================================================================
// Generic Validation Result Type
// ============================================================================

/**
 * Result of a safe validation operation.
 */
export type ValidationResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: z.ZodError };

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate agent data.
 * @throws ZodError if validation fails
 */
export function validateAgent(data: unknown): Agent {
  return AgentSchema.parse(data);
}

/**
 * Safely validate agent data.
 */
export function safeValidateAgent(data: unknown): ValidationResult<Agent> {
  const result = AgentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate feature data.
 * @throws ZodError if validation fails
 */
export function validateFeature(data: unknown): Feature {
  return FeatureSchema.parse(data);
}

/**
 * Safely validate feature data.
 */
export function safeValidateFeature(data: unknown): ValidationResult<Feature> {
  const result = FeatureSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate skill data.
 * @throws ZodError if validation fails
 */
export function validateSkill(data: unknown): Skill {
  return SkillSchema.parse(data);
}

/**
 * Safely validate skill data.
 */
export function safeValidateSkill(data: unknown): ValidationResult<Skill> {
  const result = SkillSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate workflow data.
 * @throws ZodError if validation fails
 */
export function validateWorkflow(data: unknown): Workflow {
  return WorkflowSchema.parse(data);
}

/**
 * Safely validate workflow data.
 */
export function safeValidateWorkflow(data: unknown): ValidationResult<Workflow> {
  const result = WorkflowSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate stage data.
 * @throws ZodError if validation fails
 */
export function validateStage(data: unknown): Stage {
  return StageSchema.parse(data);
}

/**
 * Safely validate stage data.
 */
export function safeValidateStage(data: unknown): ValidationResult<Stage> {
  const result = StageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

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
export function safeValidateSession(data: unknown): ValidationResult<Session> {
  const result = SessionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate worktree data.
 * @throws ZodError if validation fails
 */
export function validateWorktree(data: unknown): Worktree {
  return WorktreeSchema.parse(data);
}

/**
 * Safely validate worktree data.
 */
export function safeValidateWorktree(data: unknown): ValidationResult<Worktree> {
  const result = WorktreeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate handoff data.
 * @throws ZodError if validation fails
 */
export function validateHandoff(data: unknown): Handoff {
  return HandoffSchema.parse(data);
}

/**
 * Safely validate handoff data.
 */
export function safeValidateHandoff(data: unknown): ValidationResult<Handoff> {
  const result = HandoffSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate integration data.
 * @throws ZodError if validation fails
 */
export function validateIntegration(data: unknown): Integration {
  return IntegrationSchema.parse(data);
}

/**
 * Safely validate integration data.
 */
export function safeValidateIntegration(data: unknown): ValidationResult<Integration> {
  const result = IntegrationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format Zod validation errors for user-friendly display.
 */
export function formatValidationErrors(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `  - ${path || "root"}: ${issue.message}`;
  });
  return `Validation failed:\n${issues.join("\n")}`;
}

/**
 * Get a flat list of validation error messages.
 */
export function getValidationErrorMessages(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

/**
 * Check if an error is a Zod validation error.
 */
export function isValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate an array of items and return results.
 */
export function validateBatch<T>(
  items: unknown[],
  schema: z.ZodSchema<T>
): { valid: T[]; invalid: { index: number; error: z.ZodError }[] } {
  const valid: T[] = [];
  const invalid: { index: number; error: z.ZodError }[] = [];

  items.forEach((item, index) => {
    const result = schema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({ index, error: result.error });
    }
  });

  return { valid, invalid };
}

// ============================================================================
// Schema Map
// ============================================================================

/**
 * Map of entity types to their schemas.
 */
export const ENTITY_SCHEMAS = {
  agent: AgentSchema,
  feature: FeatureSchema,
  skill: SkillSchema,
  workflow: WorkflowSchema,
  stage: StageSchema,
  session: SessionSchema,
  worktree: WorktreeSchema,
  handoff: HandoffSchema,
  integration: IntegrationSchema,
} as const;

export type EntityType = keyof typeof ENTITY_SCHEMAS;

/**
 * Validate data against a named entity schema.
 */
export function validateEntity<T extends EntityType>(
  type: T,
  data: unknown
): z.infer<(typeof ENTITY_SCHEMAS)[T]> {
  return ENTITY_SCHEMAS[type].parse(data);
}

/**
 * Safely validate data against a named entity schema.
 */
export function safeValidateEntity<T extends EntityType>(
  type: T,
  data: unknown
): ValidationResult<z.infer<(typeof ENTITY_SCHEMAS)[T]>> {
  const result = ENTITY_SCHEMAS[type].safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
