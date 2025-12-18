/**
 * Feature Entity
 *
 * Represents a feature or task being developed by the squad.
 * Features track progress through workflow stages and maintain
 * requirements, acceptance criteria, and external references.
 */

import { z } from "zod";
import type { FeatureId, SessionId, WorkflowId, StageId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema } from "../types/common";

// ============================================================================
// Feature Status
// ============================================================================

/**
 * Feature lifecycle states.
 */
export const FeatureStatusSchema = z.enum([
  "planning",
  "in_progress",
  "review",
  "testing",
  "completed",
  "blocked",
  "cancelled",
]);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

/**
 * Status descriptions for UI display.
 */
export const FEATURE_STATUS_DESCRIPTIONS: Record<FeatureStatus, string> = {
  planning: "Feature is in the planning phase",
  in_progress: "Feature is actively being developed",
  review: "Feature is under review",
  testing: "Feature is being tested",
  completed: "Feature has been completed successfully",
  blocked: "Feature is blocked by an issue",
  cancelled: "Feature has been cancelled",
};

/**
 * Terminal states that cannot transition to other states.
 */
export const FEATURE_TERMINAL_STATES: FeatureStatus[] = ["completed", "cancelled"];

// ============================================================================
// Feature Entity
// ============================================================================

/**
 * ID validation patterns.
 */
const FeatureIdPattern = createIdPattern("ftr");
const SessionIdPattern = createIdPattern("ses");
const WorkflowIdPattern = createIdPattern("wfl");
const StageIdPattern = createIdPattern("stg");

/**
 * Feature entity schema.
 */
export const FeatureSchema = z.object({
  /** Unique feature identifier */
  id: z.string().regex(FeatureIdPattern, "Invalid FeatureId format"),
  /** Feature title */
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  /** Detailed description */
  description: z.string().default(""),
  /** Assigned workflow ID */
  workflowId: z.string().regex(WorkflowIdPattern, "Invalid WorkflowId format"),
  /** Associated session ID */
  sessionId: z.string().regex(SessionIdPattern, "Invalid SessionId format"),
  /** Current workflow stage ID */
  currentStage: z.string().regex(StageIdPattern, "Invalid StageId format"),
  /** Lifecycle state */
  status: FeatureStatusSchema.default("planning"),
  /** Git branch name for this feature */
  branchName: z.string().min(1, "Branch name is required"),
  /** Feature requirements list */
  requirements: z.array(z.string()).default([]),
  /** Success/acceptance criteria */
  acceptanceCriteria: z.array(z.string()).default([]),
  /** External reference (GitHub issue, Linear ticket, etc.) */
  externalId: z.string().optional(),
  /** External reference URL */
  externalUrl: z.string().url().optional(),
  /** Priority level */
  priority: z.enum(["urgent", "high", "normal", "low"]).default("normal"),
  /** Estimated effort (story points or hours) */
  estimate: z.number().positive().optional(),
  /** Assigned team members or agents */
  assignees: z.array(z.string()).default([]),
  /** Tags for categorization */
  tags: z.array(z.string()).default([]),
  /** Creation timestamp */
  createdAt: DateSchema,
  /** Last update timestamp */
  updatedAt: DateSchema,
});

/**
 * Feature entity type.
 */
export type Feature = z.infer<typeof FeatureSchema>;

/**
 * Typed Feature with branded IDs.
 */
export interface TypedFeature extends Omit<Feature, "id" | "sessionId" | "workflowId" | "currentStage"> {
  id: FeatureId;
  sessionId: SessionId;
  workflowId: WorkflowId;
  currentStage: StageId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial feature schema for updates.
 */
export const PartialFeatureSchema = FeatureSchema.partial();
export type PartialFeature = z.infer<typeof PartialFeatureSchema>;

/**
 * Schema for creating a new feature.
 */
export const CreateFeatureSchema = FeatureSchema.omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  createdAt: DateSchema.optional(),
  updatedAt: DateSchema.optional(),
});
export type CreateFeature = z.infer<typeof CreateFeatureSchema>;

/**
 * Schema for updating an existing feature.
 */
export const UpdateFeatureSchema = FeatureSchema.partial().omit({
  id: true,
  sessionId: true,
  createdAt: true,
}).extend({
  updatedAt: DateSchema.optional(),
});
export type UpdateFeature = z.infer<typeof UpdateFeatureSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

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
export function safeValidateFeature(data: unknown): {
  success: boolean;
  data?: Feature;
  error?: z.ZodError;
} {
  const result = FeatureSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new feature with defaults.
 */
export function createFeature(
  data: Omit<CreateFeature, "createdAt" | "updatedAt" | "status" | "requirements" | "acceptanceCriteria" | "description" | "assignees" | "tags"> &
    Partial<Pick<CreateFeature, "status" | "requirements" | "acceptanceCriteria" | "description" | "assignees" | "tags">>
): Feature {
  const now = new Date();
  return FeatureSchema.parse({
    ...data,
    status: data.status ?? "planning",
    description: data.description ?? "",
    requirements: data.requirements ?? [],
    acceptanceCriteria: data.acceptanceCriteria ?? [],
    assignees: data.assignees ?? [],
    tags: data.tags ?? [],
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update a feature with new data.
 */
export function updateFeature(feature: Feature, updates: UpdateFeature): Feature {
  return FeatureSchema.parse({
    ...feature,
    ...updates,
    updatedAt: new Date(),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a feature status is terminal.
 */
export function isFeatureTerminal(status: FeatureStatus): boolean {
  return FEATURE_TERMINAL_STATES.includes(status);
}

/**
 * Generate a Git branch name from a feature name.
 */
export function generateBranchName(featureName: string, prefix = "feature"): string {
  const sanitized = featureName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
  return `${prefix}/${sanitized}`;
}
