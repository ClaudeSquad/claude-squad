/**
 * Workflow Entity
 *
 * Defines multi-stage workflows for feature development.
 * Workflows orchestrate the sequence of stages, agent assignments,
 * and review gates for completing features.
 */

import { z } from "zod";
import type { WorkflowId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema, SourceTypeSchema } from "../types/common";
import { StageSchema, type Stage } from "./stage";

// ============================================================================
// Workflow Entity
// ============================================================================

/**
 * ID validation pattern.
 */
const WorkflowIdPattern = createIdPattern("wfl");

/**
 * Workflow entity schema.
 */
export const WorkflowSchema = z.object({
  /** Unique workflow identifier */
  id: z.string().regex(WorkflowIdPattern, "Invalid WorkflowId format"),
  /** Workflow name */
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  /** Purpose and use case description */
  description: z.string().default(""),
  /** Ordered workflow stages */
  stages: z.array(StageSchema).min(1, "At least one stage is required"),
  /** Whether this is the default workflow */
  isDefault: z.boolean().default(false),
  /** Whether this ships with the system */
  isBuiltIn: z.boolean().default(false),
  /** Origin of the workflow */
  source: SourceTypeSchema.default("custom"),
  /** Version for built-in workflows */
  version: z.string().default("1.0.0"),
  /** Tags for categorization */
  tags: z.array(z.string()).default([]),
  /** Estimated total duration in minutes */
  estimatedDuration: z.number().int().positive().optional(),
  /** Creation timestamp */
  createdAt: DateSchema,
  /** Last update timestamp */
  updatedAt: DateSchema,
});

/**
 * Workflow entity type.
 */
export type Workflow = z.infer<typeof WorkflowSchema>;

/**
 * Typed Workflow with branded IDs.
 */
export interface TypedWorkflow extends Omit<Workflow, "id"> {
  id: WorkflowId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial workflow schema for updates.
 */
export const PartialWorkflowSchema = WorkflowSchema.partial();
export type PartialWorkflow = z.infer<typeof PartialWorkflowSchema>;

/**
 * Schema for creating a new workflow.
 */
export const CreateWorkflowSchema = WorkflowSchema.omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  createdAt: DateSchema.optional(),
  updatedAt: DateSchema.optional(),
});
export type CreateWorkflow = z.infer<typeof CreateWorkflowSchema>;

/**
 * Schema for updating an existing workflow.
 */
export const UpdateWorkflowSchema = WorkflowSchema.partial().omit({
  id: true,
  createdAt: true,
}).extend({
  updatedAt: DateSchema.optional(),
});
export type UpdateWorkflow = z.infer<typeof UpdateWorkflowSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

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
export function safeValidateWorkflow(data: unknown): {
  success: boolean;
  data?: Workflow;
  error?: z.ZodError;
} {
  const result = WorkflowSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new workflow with defaults.
 */
export function createWorkflow(
  data: Omit<CreateWorkflow, "createdAt" | "updatedAt" | "isDefault" | "isBuiltIn" | "source" | "description" | "tags" | "version"> &
    Partial<Pick<CreateWorkflow, "isDefault" | "isBuiltIn" | "source" | "description" | "tags" | "version">>
): Workflow {
  const now = new Date();
  return WorkflowSchema.parse({
    ...data,
    description: data.description ?? "",
    isDefault: data.isDefault ?? false,
    isBuiltIn: data.isBuiltIn ?? false,
    source: data.source ?? "custom",
    version: data.version ?? "1.0.0",
    tags: data.tags ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update a workflow with new data.
 */
export function updateWorkflow(workflow: Workflow, updates: UpdateWorkflow): Workflow {
  return WorkflowSchema.parse({
    ...workflow,
    ...updates,
    updatedAt: new Date(),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the first stage of a workflow.
 */
export function getFirstStage(workflow: Workflow): Stage {
  const sorted = [...workflow.stages].sort((a, b) => a.order - b.order);
  const first = sorted[0];
  if (!first) {
    throw new Error("Workflow has no stages");
  }
  return first;
}

/**
 * Get a stage by ID.
 */
export function getStageById(workflow: Workflow, stageId: string): Stage | undefined {
  return workflow.stages.find((s) => s.id === stageId);
}

/**
 * Get the total number of stages.
 */
export function getStageCount(workflow: Workflow): number {
  return workflow.stages.length;
}

/**
 * Get all unique agent roles required by the workflow.
 */
export function getWorkflowAgentRoles(workflow: Workflow): string[] {
  const roles = new Set<string>();
  for (const stage of workflow.stages) {
    for (const role of stage.agents) {
      roles.add(role);
    }
  }
  return [...roles];
}

/**
 * Calculate estimated total duration from stages.
 */
export function calculateEstimatedDuration(workflow: Workflow): number {
  return workflow.stages.reduce((total, stage) => {
    return total + (stage.expectedDuration ?? 30); // Default 30 minutes per stage
  }, 0);
}

/**
 * Get stages that have review gates.
 */
export function getReviewGateStages(workflow: Workflow): Stage[] {
  return workflow.stages.filter((s) => s.reviewGate !== null);
}

// ============================================================================
// Built-in Workflow Templates
// ============================================================================

/**
 * Built-in workflow names.
 */
export const BUILTIN_WORKFLOWS = [
  "feature",
  "bugfix",
  "refactor",
  "web-app-sdlc",
] as const;

export type BuiltinWorkflowName = (typeof BUILTIN_WORKFLOWS)[number];

/**
 * Check if a workflow name is a built-in workflow.
 */
export function isBuiltinWorkflow(name: string): name is BuiltinWorkflowName {
  return BUILTIN_WORKFLOWS.includes(name as BuiltinWorkflowName);
}
