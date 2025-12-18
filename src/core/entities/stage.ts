/**
 * Stage Entity
 *
 * Represents a single stage within a workflow.
 * Stages define the sequence of work, agent assignments,
 * and optional review gates.
 */

import { z } from "zod";
import type { StageId } from "../types/id";
import { createIdPattern } from "../types/id";
import {
  ReviewGateSchema,
  ExecutionModeSchema,
} from "../types/common";
import { AgentRoleSchema } from "./agent";

// ============================================================================
// Stage Entity
// ============================================================================

/**
 * ID validation pattern.
 */
const StageIdPattern = createIdPattern("stg");

/**
 * Stage entity schema.
 */
export const StageSchema = z.object({
  /** Unique stage identifier */
  id: z.string().regex(StageIdPattern, "Invalid StageId format"),
  /** Stage name */
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  /** Stage purpose description */
  description: z.string().default(""),
  /** Required agent roles for this stage */
  agents: z.array(AgentRoleSchema).min(1, "At least one agent role is required"),
  /** Execution order within the workflow */
  order: z.number().int().nonnegative(),
  /** How agents coordinate (sequential or parallel) */
  execution: ExecutionModeSchema.default("sequential"),
  /** Optional review gate configuration */
  reviewGate: ReviewGateSchema.nullable().default(null),
  /** Template for generating handoff content */
  handoffTemplate: z.string().optional(),
  /** Expected duration in minutes (for estimation) */
  expectedDuration: z.number().int().positive().optional(),
  /** Whether this stage is optional */
  isOptional: z.boolean().default(false),
  /** Conditions for skipping this stage */
  skipConditions: z.array(z.string()).default([]),
});

/**
 * Stage entity type.
 */
export type Stage = z.infer<typeof StageSchema>;

/**
 * Typed Stage with branded IDs.
 */
export interface TypedStage extends Omit<Stage, "id"> {
  id: StageId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial stage schema for updates.
 */
export const PartialStageSchema = StageSchema.partial();
export type PartialStage = z.infer<typeof PartialStageSchema>;

/**
 * Schema for creating a new stage.
 */
export const CreateStageSchema = StageSchema;
export type CreateStage = z.infer<typeof CreateStageSchema>;

/**
 * Schema for updating an existing stage.
 */
export const UpdateStageSchema = StageSchema.partial().omit({
  id: true,
});
export type UpdateStage = z.infer<typeof UpdateStageSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

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
export function safeValidateStage(data: unknown): {
  success: boolean;
  data?: Stage;
  error?: z.ZodError;
} {
  const result = StageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new stage with defaults.
 */
export function createStage(
  data: Omit<CreateStage, "execution" | "reviewGate" | "description" | "isOptional" | "skipConditions"> &
    Partial<Pick<CreateStage, "execution" | "reviewGate" | "description" | "isOptional" | "skipConditions">>
): Stage {
  return StageSchema.parse({
    ...data,
    description: data.description ?? "",
    execution: data.execution ?? "sequential",
    reviewGate: data.reviewGate ?? null,
    isOptional: data.isOptional ?? false,
    skipConditions: data.skipConditions ?? [],
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a stage has a review gate.
 */
export function hasReviewGate(stage: Stage): boolean {
  return stage.reviewGate !== null;
}

/**
 * Check if a stage requires human approval.
 */
export function requiresHumanApproval(stage: Stage): boolean {
  return stage.reviewGate?.behavior === "pause";
}

/**
 * Sort stages by their order.
 */
export function sortStages(stages: Stage[]): Stage[] {
  return [...stages].sort((a, b) => a.order - b.order);
}

/**
 * Get the next stage after the given stage.
 */
export function getNextStage(stages: Stage[], currentStage: Stage): Stage | undefined {
  const sorted = sortStages(stages);
  const currentIndex = sorted.findIndex((s) => s.id === currentStage.id);
  return sorted[currentIndex + 1];
}

/**
 * Get all agent roles required for a stage.
 */
export function getStageAgentRoles(stage: Stage): string[] {
  return [...new Set(stage.agents)];
}
