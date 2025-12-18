/**
 * Configuration Schema
 *
 * Defines the complete configuration schema for Claude Squad using Zod.
 * This schema validates configuration from multiple sources:
 * - Environment variables (SQUAD_*)
 * - Project config (.claude/squad.yaml)
 * - User config (~/.config/squad/config.yaml)
 */

import { z } from "zod";

/**
 * Model types supported by Claude
 */
export const ModelSchema = z.enum(["sonnet", "opus", "haiku"]);
export type Model = z.infer<typeof ModelSchema>;

/**
 * Review gate behavior options
 */
export const ReviewGateBehaviorSchema = z.enum(["pause", "notify", "auto-approve"]);
export type ReviewGateBehavior = z.infer<typeof ReviewGateBehaviorSchema>;

/**
 * Source control integrations
 */
export const SourceControlSchema = z.enum(["github", "gitlab", "bitbucket", "none"]);
export type SourceControl = z.infer<typeof SourceControlSchema>;

/**
 * Issue tracking integrations
 */
export const IssueTrackingSchema = z.enum(["linear", "jira", "asana", "notion", "none"]);
export type IssueTracking = z.infer<typeof IssueTrackingSchema>;

/**
 * Communication integrations
 */
export const CommunicationSchema = z.enum(["slack", "discord", "email", "teams"]);
export type Communication = z.infer<typeof CommunicationSchema>;

/**
 * Design & docs integrations
 */
export const DesignDocsSchema = z.enum(["figma", "storybook"]);
export type DesignDocs = z.infer<typeof DesignDocsSchema>;

/**
 * Repository role in multi-repo setups
 */
export const RepositoryRoleSchema = z.enum(["primary", "dependency"]);
export type RepositoryRole = z.infer<typeof RepositoryRoleSchema>;

/**
 * Repository configuration for multi-repo projects
 */
export const RepositorySchema = z.object({
  name: z.string().min(1, "Repository name is required"),
  path: z.string().min(1, "Repository path is required"),
  role: RepositoryRoleSchema,
  branch: z.string().default("main"),
});
export type Repository = z.infer<typeof RepositorySchema>;

/**
 * Default settings for new features/sessions
 */
export const DefaultsSchema = z.object({
  workflow: z.string().default("feature"),
  model: ModelSchema.default("sonnet"),
  maxConcurrentAgents: z.number().min(1).max(10).default(5),
  reviewGateBehavior: ReviewGateBehaviorSchema.default("pause"),
});
export type Defaults = z.infer<typeof DefaultsSchema>;

/**
 * Integration settings
 */
export const IntegrationsSchema = z.object({
  sourceControl: SourceControlSchema.optional(),
  issueTracking: IssueTrackingSchema.optional(),
  communication: z.array(CommunicationSchema).default([]),
  designDocs: z.array(DesignDocsSchema).default([]),
});
export type Integrations = z.infer<typeof IntegrationsSchema>;

/**
 * Agent configuration overrides
 */
export const AgentsConfigSchema = z.object({
  enabled: z.array(z.string()).optional(),
  disabled: z.array(z.string()).optional(),
  customPath: z.string().optional(),
});
export type AgentsConfig = z.infer<typeof AgentsConfigSchema>;

/**
 * Workflow configuration overrides
 */
export const WorkflowsConfigSchema = z.object({
  default: z.string().optional(),
  customPath: z.string().optional(),
});
export type WorkflowsConfig = z.infer<typeof WorkflowsConfigSchema>;

/**
 * Cost limit settings
 */
export const CostsConfigSchema = z.object({
  sessionLimit: z.number().positive().optional(),
  featureLimit: z.number().positive().optional(),
  alertThreshold: z.number().min(0).max(1).optional(),
});
export type CostsConfig = z.infer<typeof CostsConfigSchema>;

/**
 * Complete Squad configuration schema
 */
export const SquadConfigSchema = z.object({
  // Project metadata
  projectName: z.string().min(1, "Project name is required"),
  projectPath: z.string().optional(),

  // Default settings
  defaults: DefaultsSchema.default({}),

  // Integration settings
  integrations: IntegrationsSchema.default({}),

  // Multi-repo configuration
  repositories: z.array(RepositorySchema).optional(),

  // Agent overrides
  agents: AgentsConfigSchema.optional(),

  // Workflow overrides
  workflows: WorkflowsConfigSchema.optional(),

  // Cost limits
  costs: CostsConfigSchema.optional(),
});

export type SquadConfig = z.infer<typeof SquadConfigSchema>;

/**
 * Partial config schema for loading from individual sources
 * All fields are optional to allow merging from multiple sources
 */
export const PartialSquadConfigSchema = SquadConfigSchema.partial();
export type PartialSquadConfig = z.infer<typeof PartialSquadConfigSchema>;

/**
 * Environment variable prefix for configuration
 */
export const ENV_PREFIX = "SQUAD_";

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<SquadConfig> = {
  defaults: {
    workflow: "feature",
    model: "sonnet",
    maxConcurrentAgents: 5,
    reviewGateBehavior: "pause",
  },
  integrations: {
    communication: [],
    designDocs: [],
  },
};

/**
 * Configuration file names
 */
export const CONFIG_FILES = {
  project: ".claude/squad.yaml",
  user: "~/.config/squad/config.yaml",
} as const;

/**
 * Validate configuration and return typed result
 */
export function validateConfig(config: unknown): SquadConfig {
  return SquadConfigSchema.parse(config);
}

/**
 * Safely validate configuration, returning errors instead of throwing
 */
export function safeValidateConfig(config: unknown): {
  success: boolean;
  data?: SquadConfig;
  error?: z.ZodError;
} {
  const result = SquadConfigSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod validation errors for user-friendly display
 */
export function formatValidationErrors(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return `  - ${path}: ${issue.message}`;
  });
  return `Configuration validation failed:\n${issues.join("\n")}`;
}
