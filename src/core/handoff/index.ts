/**
 * Handoff System
 *
 * Provides structured context transfer between workflow stages.
 * Includes YAML schema, service layer, and context aggregation.
 *
 * @module core/handoff
 */

// Schema exports
export {
  // Version
  HANDOFF_YAML_VERSION,
  // Agent Info Types
  HandoffAgentInfoSchema,
  HandoffDestinationSchema,
  // Context Types
  HandoffDecisionSchema,
  HandoffCurrentStateSchema,
  HandoffContextSchema,
  // File Types
  FileChangeTypeSchema,
  FileModifiedSchema,
  // Next Steps & Blockers
  NextStepSchema,
  BlockerSchema,
  // Git State
  GitStateSchema,
  // Metadata
  HandoffMetadataSchema,
  // Main Schema
  HandoffYamlSchema,
  // Validation Functions
  validateHandoffYaml,
  safeValidateHandoffYaml,
  // Factory Functions
  createHandoffYaml,
  // Utility Functions
  getHandoffYamlPath,
  getHandoffDirPath,
  getStageHandoffPath,
  hasBlockers,
  hasCriticalBlockers,
  getHighPrioritySteps,
  countFilesChanged,
  countLinesChanged,
  // Types
  type HandoffAgentInfo,
  type HandoffDestination,
  type HandoffDecision,
  type HandoffCurrentState,
  type HandoffContext,
  type FileChangeType,
  type FileModified,
  type NextStep,
  type Blocker,
  type GitState,
  type HandoffMetadata,
  type HandoffYaml,
  type TypedHandoffYaml,
  type CreateHandoffYamlOptions,
} from "./schema.js";

// Service exports
export {
  HandoffService,
  createHandoffService,
  type CreateHandoffOptions,
  type ReadHandoffOptions,
  type HandoffServiceDeps,
} from "./service.js";

// Context Builder exports
export {
  ContextBuilder,
  createContextBuilder,
  type AggregatedContext,
  type BuildContextOptions,
  type FormattedContext,
} from "./context-builder.js";
