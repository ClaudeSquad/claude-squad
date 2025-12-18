/**
 * HandoffYaml Schema
 *
 * Defines the YAML file format for HANDOFF.yaml files written to worktrees.
 * This schema is optimized for human readability and agent consumption,
 * providing a structured format for context transfer between workflow stages.
 */

import { z } from "zod";
import type { AgentId, FeatureId, StageId, SessionId } from "../types/id.js";
import { PrioritySchema, SeveritySchema } from "../types/common.js";

// ============================================================================
// Agent Info Types
// ============================================================================

/**
 * Source agent information in handoff
 */
export const HandoffAgentInfoSchema = z.object({
  /** Agent ID */
  id: z.string(),
  /** Human-readable agent name */
  name: z.string(),
  /** Agent role (e.g., architect, frontend, backend) */
  role: z.string(),
});
export type HandoffAgentInfo = z.infer<typeof HandoffAgentInfoSchema>;

/**
 * Destination agent reference (can be specific or "any")
 */
export const HandoffDestinationSchema = z.union([
  z.object({
    /** Specific agent ID */
    id: z.string(),
    /** Agent name */
    name: z.string(),
  }),
  z.literal("any"),
]);
export type HandoffDestination = z.infer<typeof HandoffDestinationSchema>;

// ============================================================================
// Context Types
// ============================================================================

/**
 * Decision made during the stage
 */
export const HandoffDecisionSchema = z.object({
  /** Brief title of the decision */
  title: z.string(),
  /** What was decided */
  decision: z.string(),
  /** Why this decision was made */
  rationale: z.string().optional(),
  /** Alternatives that were considered */
  alternatives: z.array(z.string()).optional(),
});
export type HandoffDecision = z.infer<typeof HandoffDecisionSchema>;

/**
 * Current state information
 */
export const HandoffCurrentStateSchema = z.object({
  /** What phase the work is in */
  phase: z.string(),
  /** Percentage complete (0-100) */
  progress: z.number().min(0).max(100),
  /** Brief status description */
  status: z.string(),
  /** Active work items */
  activeItems: z.array(z.string()).optional(),
});
export type HandoffCurrentState = z.infer<typeof HandoffCurrentStateSchema>;

/**
 * Handoff context section
 */
export const HandoffContextSchema = z.object({
  /** High-level summary of what was accomplished (max 500 chars) */
  summary: z.string().max(500),
  /** Key decisions made during this stage */
  decisions: z.array(HandoffDecisionSchema).default([]),
  /** Current state of the work */
  currentState: HandoffCurrentStateSchema,
});
export type HandoffContext = z.infer<typeof HandoffContextSchema>;

// ============================================================================
// Files Modified Types
// ============================================================================

/**
 * Type of file change
 */
export const FileChangeTypeSchema = z.enum([
  "created",
  "modified",
  "deleted",
  "renamed",
]);
export type FileChangeType = z.infer<typeof FileChangeTypeSchema>;

/**
 * Information about a modified file
 */
export const FileModifiedSchema = z.object({
  /** File path relative to repo root */
  path: z.string(),
  /** Description of the change */
  description: z.string(),
  /** Type of change */
  changeType: FileChangeTypeSchema,
  /** Lines added */
  linesAdded: z.number().int().nonnegative().optional(),
  /** Lines removed */
  linesRemoved: z.number().int().nonnegative().optional(),
});
export type FileModified = z.infer<typeof FileModifiedSchema>;

// ============================================================================
// Next Steps Types
// ============================================================================

/**
 * Next step for the receiving agent
 */
export const NextStepSchema = z.object({
  /** Priority level */
  priority: PrioritySchema,
  /** Description of what needs to be done */
  description: z.string(),
  /** Specific agent role this is assigned to (optional) */
  assignedTo: z.string().optional(),
  /** Estimated effort (e.g., "1 hour", "2-3 hours") */
  estimatedEffort: z.string().optional(),
  /** Dependencies on other steps */
  dependsOn: z.array(z.string()).optional(),
});
export type NextStep = z.infer<typeof NextStepSchema>;

// ============================================================================
// Blocker Types
// ============================================================================

/**
 * Blocking issue that may prevent progress
 */
export const BlockerSchema = z.object({
  /** Severity of the blocker */
  severity: SeveritySchema,
  /** Description of the blocker */
  description: z.string(),
  /** Suggested resolution or workaround */
  suggestedResolution: z.string().optional(),
  /** Related file or component */
  relatedTo: z.string().optional(),
});
export type Blocker = z.infer<typeof BlockerSchema>;

// ============================================================================
// Git State Types
// ============================================================================

/**
 * Git repository state at time of handoff
 */
export const GitStateSchema = z.object({
  /** Current branch name */
  branch: z.string(),
  /** Current commit hash */
  commit: z.string(),
  /** Short commit hash */
  shortCommit: z.string().optional(),
  /** Commit message */
  commitMessage: z.string().optional(),
  /** Number of commits ahead of base branch */
  ahead: z.number().int().nonnegative().optional(),
  /** Number of commits behind base branch */
  behind: z.number().int().nonnegative().optional(),
  /** Whether there are uncommitted changes */
  isDirty: z.boolean(),
  /** Number of staged files */
  stagedFiles: z.number().int().nonnegative().optional(),
  /** Number of modified files */
  modifiedFiles: z.number().int().nonnegative().optional(),
});
export type GitState = z.infer<typeof GitStateSchema>;

// ============================================================================
// Metadata Types
// ============================================================================

/**
 * Handoff metadata
 */
export const HandoffMetadataSchema = z.object({
  /** ISO timestamp of handoff creation */
  timestamp: z.string().datetime(),
  /** Session ID */
  sessionId: z.string().optional(),
  /** Feature ID */
  featureId: z.string(),
  /** Stage ID */
  stageId: z.string().optional(),
  /** Priority of this handoff */
  priority: PrioritySchema.optional(),
  /** Urgency level */
  urgency: z.enum(["immediate", "normal", "low"]).default("normal"),
  /** Git state at time of handoff */
  gitState: GitStateSchema.optional(),
  /** Duration of the stage in milliseconds */
  durationMs: z.number().int().nonnegative().optional(),
  /** Token usage during the stage */
  tokensUsed: z.number().int().nonnegative().optional(),
  /** Cost incurred during the stage */
  costUsd: z.number().nonnegative().optional(),
});
export type HandoffMetadata = z.infer<typeof HandoffMetadataSchema>;

// ============================================================================
// Main HandoffYaml Schema
// ============================================================================

/**
 * Version of the handoff schema
 */
export const HANDOFF_YAML_VERSION = "1.0" as const;

/**
 * Complete HANDOFF.yaml file schema
 */
export const HandoffYamlSchema = z.object({
  /** Schema version */
  version: z.literal(HANDOFF_YAML_VERSION),
  /** Source agent information */
  fromAgent: HandoffAgentInfoSchema,
  /** Destination agent (specific or "any") */
  toAgent: HandoffDestinationSchema,
  /** Context about the completed work */
  context: HandoffContextSchema,
  /** Files that were modified */
  filesModified: z.array(FileModifiedSchema).default([]),
  /** Next steps for the receiving agent */
  nextSteps: z.array(NextStepSchema).default([]),
  /** Blocking issues */
  blockers: z.array(BlockerSchema).default([]),
  /** Handoff metadata */
  metadata: HandoffMetadataSchema,
});
export type HandoffYaml = z.infer<typeof HandoffYamlSchema>;

// ============================================================================
// Typed HandoffYaml with Branded IDs
// ============================================================================

/**
 * HandoffYaml with typed branded IDs
 */
export interface TypedHandoffYaml extends Omit<HandoffYaml, "fromAgent" | "metadata"> {
  fromAgent: Omit<HandoffAgentInfo, "id"> & { id: AgentId };
  metadata: Omit<HandoffMetadata, "featureId" | "stageId" | "sessionId"> & {
    featureId: FeatureId;
    stageId?: StageId;
    sessionId?: SessionId;
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a handoff YAML object
 * @throws ZodError if validation fails
 */
export function validateHandoffYaml(data: unknown): HandoffYaml {
  return HandoffYamlSchema.parse(data);
}

/**
 * Safely validate a handoff YAML object
 */
export function safeValidateHandoffYaml(data: unknown): {
  success: boolean;
  data?: HandoffYaml;
  error?: z.ZodError;
} {
  const result = HandoffYamlSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Options for creating a HandoffYaml
 */
export interface CreateHandoffYamlOptions {
  fromAgent: HandoffAgentInfo;
  toAgent?: HandoffDestination;
  context: HandoffContext;
  filesModified?: FileModified[];
  nextSteps?: NextStep[];
  blockers?: Blocker[];
  featureId: string;
  stageId?: string;
  sessionId?: string;
  priority?: z.infer<typeof PrioritySchema>;
  gitState?: GitState;
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
}

/**
 * Create a new HandoffYaml object with defaults
 */
export function createHandoffYaml(options: CreateHandoffYamlOptions): HandoffYaml {
  return HandoffYamlSchema.parse({
    version: HANDOFF_YAML_VERSION,
    fromAgent: options.fromAgent,
    toAgent: options.toAgent ?? "any",
    context: options.context,
    filesModified: options.filesModified ?? [],
    nextSteps: options.nextSteps ?? [],
    blockers: options.blockers ?? [],
    metadata: {
      timestamp: new Date().toISOString(),
      sessionId: options.sessionId,
      featureId: options.featureId,
      stageId: options.stageId,
      priority: options.priority,
      urgency: "normal",
      gitState: options.gitState,
      durationMs: options.durationMs,
      tokensUsed: options.tokensUsed,
      costUsd: options.costUsd,
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate the default HANDOFF.yaml file path
 */
export function getHandoffYamlPath(worktreePath: string): string {
  return `${worktreePath}/HANDOFF.yaml`;
}

/**
 * Get the handoff directory path for a feature
 */
export function getHandoffDirPath(worktreePath: string): string {
  return `${worktreePath}/.claude/handoffs`;
}

/**
 * Generate a stage-specific handoff file path
 */
export function getStageHandoffPath(
  worktreePath: string,
  stageId: string
): string {
  return `${worktreePath}/.claude/handoffs/HANDOFF-${stageId}.yaml`;
}

/**
 * Check if a handoff has blockers
 */
export function hasBlockers(handoff: HandoffYaml): boolean {
  return handoff.blockers.length > 0;
}

/**
 * Check if a handoff has critical blockers
 */
export function hasCriticalBlockers(handoff: HandoffYaml): boolean {
  return handoff.blockers.some((b) => b.severity === "critical");
}

/**
 * Get high priority next steps
 */
export function getHighPrioritySteps(handoff: HandoffYaml): NextStep[] {
  return handoff.nextSteps.filter(
    (step) => step.priority === "urgent" || step.priority === "high"
  );
}

/**
 * Count total files changed
 */
export function countFilesChanged(handoff: HandoffYaml): {
  created: number;
  modified: number;
  deleted: number;
  renamed: number;
  total: number;
} {
  const counts = {
    created: 0,
    modified: 0,
    deleted: 0,
    renamed: 0,
    total: 0,
  };

  for (const file of handoff.filesModified) {
    counts[file.changeType]++;
    counts.total++;
  }

  return counts;
}

/**
 * Calculate total lines changed
 */
export function countLinesChanged(handoff: HandoffYaml): {
  added: number;
  removed: number;
  net: number;
} {
  let added = 0;
  let removed = 0;

  for (const file of handoff.filesModified) {
    added += file.linesAdded ?? 0;
    removed += file.linesRemoved ?? 0;
  }

  return {
    added,
    removed,
    net: added - removed,
  };
}
