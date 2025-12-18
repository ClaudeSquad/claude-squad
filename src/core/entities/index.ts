/**
 * Domain Entities Barrel Export
 *
 * Re-exports all entity types, schemas, validation functions,
 * and state machines from the entities module.
 */

// ============================================================================
// Agent Entity
// ============================================================================
export {
  // Types
  type Agent,
  type TypedAgent,
  type AgentRole,
  type AgentStatus,
  type AgentConfig,
  type PartialAgent,
  type CreateAgent,
  type UpdateAgent,
  // Schemas
  AgentSchema,
  AgentRoleSchema,
  AgentStatusSchema,
  AgentConfigSchema,
  PartialAgentSchema,
  CreateAgentSchema,
  UpdateAgentSchema,
  // Constants
  AGENT_ROLE_DESCRIPTIONS,
  AGENT_STATUS_DESCRIPTIONS,
  // Functions
  validateAgent,
  safeValidateAgent,
  createAgent,
  updateAgent,
} from "./agent";

// ============================================================================
// Feature Entity
// ============================================================================
export {
  // Types
  type Feature,
  type TypedFeature,
  type FeatureStatus,
  type PartialFeature,
  type CreateFeature,
  type UpdateFeature,
  // Schemas
  FeatureSchema,
  FeatureStatusSchema,
  PartialFeatureSchema,
  CreateFeatureSchema,
  UpdateFeatureSchema,
  // Constants
  FEATURE_STATUS_DESCRIPTIONS,
  FEATURE_TERMINAL_STATES,
  // Functions
  validateFeature,
  safeValidateFeature,
  createFeature,
  updateFeature,
  isFeatureTerminal,
  generateBranchName,
} from "./feature";

// ============================================================================
// Skill Entity
// ============================================================================
export {
  // Types
  type Skill,
  type TypedSkill,
  type PartialSkill,
  type CreateSkill,
  type UpdateSkill,
  type SkillFrontmatter,
  // Schemas
  SkillSchema,
  SkillNameSchema,
  SemverSchema,
  PartialSkillSchema,
  CreateSkillSchema,
  UpdateSkillSchema,
  SkillFrontmatterSchema,
  // Functions
  validateSkill,
  safeValidateSkill,
  createSkill,
  updateSkill,
  skillToMarkdown,
} from "./skill";

// ============================================================================
// Stage Entity
// ============================================================================
export {
  // Types
  type Stage,
  type TypedStage,
  type PartialStage,
  type CreateStage,
  type UpdateStage,
  // Schemas
  StageSchema,
  PartialStageSchema,
  CreateStageSchema,
  UpdateStageSchema,
  // Functions
  validateStage,
  safeValidateStage,
  createStage,
  hasReviewGate,
  requiresHumanApproval,
  sortStages,
  getNextStage,
  getStageAgentRoles,
} from "./stage";

// ============================================================================
// Workflow Entity
// ============================================================================
export {
  // Types
  type Workflow,
  type TypedWorkflow,
  type PartialWorkflow,
  type CreateWorkflow,
  type UpdateWorkflow,
  type BuiltinWorkflowName,
  // Schemas
  WorkflowSchema,
  PartialWorkflowSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  // Constants
  BUILTIN_WORKFLOWS,
  // Functions
  validateWorkflow,
  safeValidateWorkflow,
  createWorkflow,
  updateWorkflow,
  getFirstStage,
  getStageById,
  getStageCount,
  getWorkflowAgentRoles,
  calculateEstimatedDuration,
  getReviewGateStages,
  isBuiltinWorkflow,
} from "./workflow";

// ============================================================================
// Session Entity
// ============================================================================
export {
  // Types
  type Session,
  type TypedSession,
  type SessionStatus,
  type PartialSession,
  type CreateSession,
  type UpdateSession,
  // Schemas
  SessionSchema,
  SessionStatusSchema,
  PartialSessionSchema,
  CreateSessionSchema,
  UpdateSessionSchema,
  // Constants
  SESSION_STATUS_DESCRIPTIONS,
  SESSION_TERMINAL_STATES,
  // Functions
  validateSession,
  safeValidateSession,
  createSession,
  updateSession,
  isSessionTerminal,
  addConversationMessage,
  addCommandToHistory,
  updateSessionCost,
  getSessionDuration,
  isSessionActive,
  markSessionCrashed,
} from "./session";

// ============================================================================
// Worktree Entity
// ============================================================================
export {
  // Types
  type Worktree,
  type TypedWorktree,
  type WorktreeStatus,
  type PartialWorktree,
  type CreateWorktree,
  type UpdateWorktree,
  // Schemas
  WorktreeSchema,
  WorktreeStatusSchema,
  PartialWorktreeSchema,
  CreateWorktreeSchema,
  UpdateWorktreeSchema,
  // Constants
  WORKTREE_STATUS_DESCRIPTIONS,
  WORKTREE_TERMINAL_STATES,
  // Functions
  validateWorktree,
  safeValidateWorktree,
  createWorktree,
  updateWorktree,
  isWorktreeTerminal,
  isWorktreeActive,
  canCleanupWorktree,
  generateWorktreePath,
  generateWorktreeBranch,
  recordCommit,
  markDirty,
} from "./worktree";

// ============================================================================
// Handoff Entity
// ============================================================================
export {
  // Types
  type Handoff,
  type TypedHandoff,
  type HandoffType,
  type HandoffContent,
  type APIContract,
  type ReviewIssue,
  type ReviewFeedback,
  type TestRecommendation,
  type TestType,
  type IssueCategory,
  type PartialHandoff,
  type CreateHandoff,
  type UpdateHandoff,
  // Schemas
  HandoffSchema,
  HandoffTypeSchema,
  HandoffContentSchema,
  APIContractSchema,
  ReviewIssueSchema,
  ReviewFeedbackSchema,
  TestRecommendationSchema,
  TestTypeSchema,
  IssueCategorySchema,
  PartialHandoffSchema,
  CreateHandoffSchema,
  UpdateHandoffSchema,
  // Constants
  HANDOFF_TYPE_DESCRIPTIONS,
  // Functions
  validateHandoff,
  safeValidateHandoff,
  createHandoff,
  markHandoffRead,
  generateHandoffPath,
  hasReviewFeedback,
  isHandoffApproved,
  getCriticalIssues,
  getTotalFilesChanged,
} from "./handoff";

// ============================================================================
// Integration Entity
// ============================================================================
export {
  // Types
  type Integration,
  type TypedIntegration,
  type IntegrationType,
  type IntegrationStatus,
  type GitHubConfig,
  type LinearConfig,
  type SlackConfig,
  type GenericConfig,
  type PartialIntegration,
  type CreateIntegration,
  type UpdateIntegration,
  // Schemas
  IntegrationSchema,
  IntegrationTypeSchema,
  IntegrationStatusSchema,
  GitHubConfigSchema,
  LinearConfigSchema,
  SlackConfigSchema,
  GenericConfigSchema,
  PartialIntegrationSchema,
  CreateIntegrationSchema,
  UpdateIntegrationSchema,
  // Constants
  INTEGRATION_TYPE_DESCRIPTIONS,
  INTEGRATION_STATUS_DESCRIPTIONS,
  INTEGRATION_CATEGORIES,
  // Functions
  validateIntegration,
  safeValidateIntegration,
  validateIntegrationConfig,
  createIntegration,
  updateIntegration,
  isIntegrationHealthy,
  needsTesting,
  updateHealthStatus,
  getIntegrationCategory,
  isSourceControlIntegration,
  isIssueTrackingIntegration,
  isCommunicationIntegration,
} from "./integration";

// ============================================================================
// Validators
// ============================================================================
export {
  // Types
  type ValidationResult,
  type EntityType,
  // Functions
  formatValidationErrors,
  getValidationErrorMessages,
  isValidationError,
  validateBatch,
  validateEntity,
  safeValidateEntity,
  // Constants
  ENTITY_SCHEMAS,
} from "./validators";

// ============================================================================
// State Machines
// ============================================================================
export * from "./state-machines";
