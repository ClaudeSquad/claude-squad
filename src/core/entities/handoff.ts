/**
 * Handoff Entity
 *
 * Represents context transfer between workflow stages.
 * Handoffs contain structured information that agents pass
 * to each other as work progresses through the workflow.
 */

import { z } from "zod";
import type { HandoffId, AgentId, FeatureId, StageId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema, SeveritySchema, HttpMethodSchema } from "../types/common";

// ============================================================================
// Handoff Type
// ============================================================================

/**
 * Categories of handoffs.
 */
export const HandoffTypeSchema = z.enum([
  "architecture",
  "implementation",
  "review_feedback",
  "test_plan",
  "deployment",
]);
export type HandoffType = z.infer<typeof HandoffTypeSchema>;

/**
 * Handoff type descriptions.
 */
export const HANDOFF_TYPE_DESCRIPTIONS: Record<HandoffType, string> = {
  architecture: "Architecture design and technical decisions",
  implementation: "Implementation details and code changes",
  review_feedback: "Code review feedback and suggestions",
  test_plan: "Testing strategy and test cases",
  deployment: "Deployment instructions and configuration",
};

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * API contract specification.
 */
export const APIContractSchema = z.object({
  /** Endpoint path */
  path: z.string(),
  /** HTTP method */
  method: HttpMethodSchema,
  /** Request body schema (JSON Schema or description) */
  requestBody: z.string().optional(),
  /** Response body schema */
  responseBody: z.string().optional(),
  /** Authentication requirement */
  auth: z.enum(["none", "jwt", "api-key", "oauth"]).optional(),
  /** Description of the endpoint */
  description: z.string().optional(),
  /** Status codes and their meanings */
  statusCodes: z.record(z.string()).optional(),
});
export type APIContract = z.infer<typeof APIContractSchema>;

/**
 * Issue category for review feedback.
 */
export const IssueCategorySchema = z.enum([
  "bug",
  "security",
  "performance",
  "style",
  "documentation",
  "architecture",
  "testing",
  "other",
]);
export type IssueCategory = z.infer<typeof IssueCategorySchema>;

/**
 * Review issue found during code review.
 */
export const ReviewIssueSchema = z.object({
  /** File path */
  file: z.string(),
  /** Line number */
  line: z.number().int().positive().optional(),
  /** End line for multi-line issues */
  endLine: z.number().int().positive().optional(),
  /** Issue severity */
  severity: SeveritySchema,
  /** Issue category */
  category: IssueCategorySchema,
  /** Issue description */
  description: z.string(),
  /** Suggested fix */
  suggestedFix: z.string().optional(),
  /** Code snippet showing the issue */
  codeSnippet: z.string().optional(),
});
export type ReviewIssue = z.infer<typeof ReviewIssueSchema>;

/**
 * Test type categories.
 */
export const TestTypeSchema = z.enum([
  "unit",
  "integration",
  "e2e",
  "performance",
  "security",
  "accessibility",
]);
export type TestType = z.infer<typeof TestTypeSchema>;

/**
 * Test recommendation from review.
 */
export const TestRecommendationSchema = z.object({
  /** Type of test */
  type: TestTypeSchema,
  /** Area/component to test */
  area: z.string(),
  /** Priority level */
  priority: z.enum(["high", "medium", "low"]),
  /** Description of what to test */
  description: z.string(),
  /** Suggested test file path */
  suggestedPath: z.string().optional(),
});
export type TestRecommendation = z.infer<typeof TestRecommendationSchema>;

/**
 * Review feedback from code review stage.
 */
export const ReviewFeedbackSchema = z.object({
  /** Overall approval status */
  approved: z.boolean(),
  /** Summary of the review */
  summary: z.string(),
  /** Issues found */
  issues: z.array(ReviewIssueSchema).default([]),
  /** General recommendations */
  recommendations: z.array(z.string()).default([]),
  /** Test recommendations */
  testRecommendations: z.array(TestRecommendationSchema).default([]),
  /** Reviewer notes */
  notes: z.string().optional(),
});
export type ReviewFeedback = z.infer<typeof ReviewFeedbackSchema>;

// ============================================================================
// Handoff Content
// ============================================================================

/**
 * Structured handoff content.
 */
export const HandoffContentSchema = z.object({
  /** High-level architecture summary */
  architectureSummary: z.string().optional(),
  /** API contracts/endpoints */
  apiContracts: z.array(APIContractSchema).optional(),
  /** Database schema changes */
  databaseSchema: z.string().optional(),
  /** Implementation notes */
  implementationNotes: z.array(z.string()).optional(),
  /** Files created during this stage */
  filesCreated: z.array(z.string()).optional(),
  /** Files modified during this stage */
  filesModified: z.array(z.string()).optional(),
  /** Files deleted during this stage */
  filesDeleted: z.array(z.string()).optional(),
  /** Code review feedback */
  reviewFeedback: ReviewFeedbackSchema.optional(),
  /** Git diff summary */
  gitDiff: z.string().optional(),
  /** Dependencies added */
  dependenciesAdded: z.array(z.string()).optional(),
  /** Environment variables needed */
  environmentVariables: z.array(z.string()).optional(),
  /** Configuration changes */
  configChanges: z.record(z.unknown()).optional(),
  /** Custom data for extensibility */
  custom: z.record(z.unknown()).optional(),
});
export type HandoffContent = z.infer<typeof HandoffContentSchema>;

// ============================================================================
// Handoff Entity
// ============================================================================

/**
 * ID validation patterns.
 */
const HandoffIdPattern = createIdPattern("hnd");
const AgentIdPattern = createIdPattern("agt");
const FeatureIdPattern = createIdPattern("ftr");
const StageIdPattern = createIdPattern("stg");

/**
 * Handoff entity schema.
 */
export const HandoffSchema = z.object({
  /** Unique handoff identifier */
  id: z.string().regex(HandoffIdPattern, "Invalid HandoffId format"),
  /** Source agent ID */
  fromAgent: z.string().regex(AgentIdPattern, "Invalid AgentId format"),
  /** Destination agent ID */
  toAgent: z.string().regex(AgentIdPattern, "Invalid AgentId format"),
  /** Associated feature ID */
  featureId: z.string().regex(FeatureIdPattern, "Invalid FeatureId format"),
  /** Workflow stage ID */
  stageId: z.string().regex(StageIdPattern, "Invalid StageId format"),
  /** Handoff category */
  type: HandoffTypeSchema,
  /** Structured content */
  content: HandoffContentSchema,
  /** File path where handoff was written (if applicable) */
  filePath: z.string().optional(),
  /** Whether the handoff has been read by the recipient */
  isRead: z.boolean().default(false),
  /** Timestamp when read */
  readAt: DateSchema.optional(),
  /** Creation timestamp */
  createdAt: DateSchema,
});

/**
 * Handoff entity type.
 */
export type Handoff = z.infer<typeof HandoffSchema>;

/**
 * Typed Handoff with branded IDs.
 */
export interface TypedHandoff extends Omit<Handoff, "id" | "fromAgent" | "toAgent" | "featureId" | "stageId"> {
  id: HandoffId;
  fromAgent: AgentId;
  toAgent: AgentId;
  featureId: FeatureId;
  stageId: StageId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial handoff schema for updates.
 */
export const PartialHandoffSchema = HandoffSchema.partial();
export type PartialHandoff = z.infer<typeof PartialHandoffSchema>;

/**
 * Schema for creating a new handoff.
 */
export const CreateHandoffSchema = HandoffSchema.omit({
  createdAt: true,
}).extend({
  createdAt: DateSchema.optional(),
});
export type CreateHandoff = z.infer<typeof CreateHandoffSchema>;

/**
 * Schema for updating an existing handoff.
 */
export const UpdateHandoffSchema = HandoffSchema.partial().omit({
  id: true,
  fromAgent: true,
  toAgent: true,
  featureId: true,
  stageId: true,
  createdAt: true,
});
export type UpdateHandoff = z.infer<typeof UpdateHandoffSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

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
export function safeValidateHandoff(data: unknown): {
  success: boolean;
  data?: Handoff;
  error?: z.ZodError;
} {
  const result = HandoffSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new handoff with defaults.
 */
export function createHandoff(
  data: Omit<CreateHandoff, "createdAt" | "isRead"> &
    Partial<Pick<CreateHandoff, "isRead">>
): Handoff {
  return HandoffSchema.parse({
    ...data,
    isRead: data.isRead ?? false,
    createdAt: new Date(),
  });
}

/**
 * Mark a handoff as read.
 */
export function markHandoffRead(handoff: Handoff): Handoff {
  return HandoffSchema.parse({
    ...handoff,
    isRead: true,
    readAt: new Date(),
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a handoff file path.
 */
export function generateHandoffPath(
  baseDir: string,
  featureId: string,
  stageId: string
): string {
  return `${baseDir}/.claude/handoffs/HANDOFF-${featureId}-${stageId}.yaml`;
}

/**
 * Check if handoff has review feedback.
 */
export function hasReviewFeedback(handoff: Handoff): boolean {
  return handoff.content.reviewFeedback !== undefined;
}

/**
 * Check if handoff is approved (for review handoffs).
 */
export function isHandoffApproved(handoff: Handoff): boolean {
  return handoff.content.reviewFeedback?.approved ?? false;
}

/**
 * Get critical issues from review feedback.
 */
export function getCriticalIssues(handoff: Handoff): ReviewIssue[] {
  return (
    handoff.content.reviewFeedback?.issues.filter(
      (issue) => issue.severity === "critical"
    ) ?? []
  );
}

/**
 * Count total files changed in handoff.
 */
export function getTotalFilesChanged(handoff: Handoff): number {
  const created = handoff.content.filesCreated?.length ?? 0;
  const modified = handoff.content.filesModified?.length ?? 0;
  const deleted = handoff.content.filesDeleted?.length ?? 0;
  return created + modified + deleted;
}
