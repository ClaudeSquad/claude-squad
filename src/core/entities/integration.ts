/**
 * Integration Entity
 *
 * Represents external service integrations (GitHub, Linear, Slack, etc.).
 * Integrations provide connectivity to external tools and services
 * that enhance the Claude Squad workflow.
 */

import { z } from "zod";
import type { IntegrationId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema } from "../types/common";

// ============================================================================
// Integration Type
// ============================================================================

/**
 * Supported integration types.
 */
export const IntegrationTypeSchema = z.enum([
  "github",
  "linear",
  "jira",
  "slack",
  "discord",
  "email",
  "notion",
  "figma",
]);
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;

/**
 * Integration type descriptions.
 */
export const INTEGRATION_TYPE_DESCRIPTIONS: Record<IntegrationType, string> = {
  github: "GitHub for source control and pull requests",
  linear: "Linear for issue tracking and project management",
  jira: "Jira for issue tracking and agile workflows",
  slack: "Slack for team communication and notifications",
  discord: "Discord for community and team communication",
  email: "Email for notifications and updates",
  notion: "Notion for documentation and knowledge base",
  figma: "Figma for design collaboration",
};

/**
 * Integration category mapping.
 */
export const INTEGRATION_CATEGORIES: Record<IntegrationType, string> = {
  github: "source-control",
  linear: "issue-tracking",
  jira: "issue-tracking",
  slack: "communication",
  discord: "communication",
  email: "communication",
  notion: "documentation",
  figma: "design",
};

// ============================================================================
// Integration Status
// ============================================================================

/**
 * Integration health status.
 */
export const IntegrationStatusSchema = z.enum(["healthy", "unhealthy", "untested"]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

/**
 * Status descriptions.
 */
export const INTEGRATION_STATUS_DESCRIPTIONS: Record<IntegrationStatus, string> = {
  healthy: "Integration is connected and working",
  unhealthy: "Integration has connection issues",
  untested: "Integration has not been tested yet",
};

// ============================================================================
// Integration Config Schemas (Type-specific)
// ============================================================================

/**
 * GitHub integration configuration.
 */
export const GitHubConfigSchema = z.object({
  /** Personal access token or app token */
  token: z.string().optional(),
  /** Organization or user name */
  owner: z.string().optional(),
  /** Default repository */
  repo: z.string().optional(),
  /** Base branch for PRs */
  baseBranch: z.string().default("main"),
  /** Whether to auto-create PRs */
  autoCreatePR: z.boolean().default(true),
  /** PR draft mode */
  draftPR: z.boolean().default(true),
});
export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Linear integration configuration.
 */
export const LinearConfigSchema = z.object({
  /** API key */
  apiKey: z.string().optional(),
  /** Team ID */
  teamId: z.string().optional(),
  /** Default project ID */
  projectId: z.string().optional(),
  /** Auto-sync issues */
  autoSync: z.boolean().default(true),
});
export type LinearConfig = z.infer<typeof LinearConfigSchema>;

/**
 * Slack integration configuration.
 */
export const SlackConfigSchema = z.object({
  /** Bot token */
  botToken: z.string().optional(),
  /** Default channel for notifications */
  defaultChannel: z.string().optional(),
  /** Notification preferences */
  notifications: z
    .object({
      onAgentStart: z.boolean().default(false),
      onAgentComplete: z.boolean().default(true),
      onError: z.boolean().default(true),
      onReviewRequired: z.boolean().default(true),
    })
    .default({}),
});
export type SlackConfig = z.infer<typeof SlackConfigSchema>;

/**
 * Generic integration configuration.
 */
export const GenericConfigSchema = z.record(z.unknown());
export type GenericConfig = z.infer<typeof GenericConfigSchema>;

// ============================================================================
// Integration Entity
// ============================================================================

/**
 * ID validation pattern.
 */
const IntegrationIdPattern = createIdPattern("int");

/**
 * Integration entity schema.
 */
export const IntegrationSchema = z.object({
  /** Unique integration identifier */
  id: z.string().regex(IntegrationIdPattern, "Invalid IntegrationId format"),
  /** Integration name (user-defined) */
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  /** Service type */
  type: IntegrationTypeSchema,
  /** Whether integration is enabled */
  enabled: z.boolean().default(true),
  /** Service-specific configuration */
  config: GenericConfigSchema.default({}),
  /** Initial setup timestamp */
  configuredAt: DateSchema,
  /** Last health check timestamp */
  lastTestedAt: DateSchema.optional(),
  /** Connection status */
  status: IntegrationStatusSchema.default("untested"),
  /** Last error message (if unhealthy) */
  lastError: z.string().optional(),
  /** Additional metadata */
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Integration entity type.
 */
export type Integration = z.infer<typeof IntegrationSchema>;

/**
 * Typed Integration with branded IDs.
 */
export interface TypedIntegration extends Omit<Integration, "id"> {
  id: IntegrationId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial integration schema for updates.
 */
export const PartialIntegrationSchema = IntegrationSchema.partial();
export type PartialIntegration = z.infer<typeof PartialIntegrationSchema>;

/**
 * Schema for creating a new integration.
 */
export const CreateIntegrationSchema = IntegrationSchema.omit({
  configuredAt: true,
}).extend({
  configuredAt: DateSchema.optional(),
});
export type CreateIntegration = z.infer<typeof CreateIntegrationSchema>;

/**
 * Schema for updating an existing integration.
 */
export const UpdateIntegrationSchema = IntegrationSchema.partial().omit({
  id: true,
  configuredAt: true,
});
export type UpdateIntegration = z.infer<typeof UpdateIntegrationSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

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
export function safeValidateIntegration(data: unknown): {
  success: boolean;
  data?: Integration;
  error?: z.ZodError;
} {
  const result = IntegrationSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate type-specific configuration.
 */
export function validateIntegrationConfig(
  type: IntegrationType,
  config: unknown
): unknown {
  switch (type) {
    case "github":
      return GitHubConfigSchema.parse(config);
    case "linear":
      return LinearConfigSchema.parse(config);
    case "slack":
    case "discord":
      return SlackConfigSchema.parse(config);
    default:
      return GenericConfigSchema.parse(config);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new integration with defaults.
 */
export function createIntegration(
  data: Pick<CreateIntegration, "id" | "name" | "type"> &
    Partial<Omit<CreateIntegration, "id" | "name" | "type">>
): Integration {
  return IntegrationSchema.parse({
    ...data,
    enabled: data.enabled ?? true,
    config: data.config ?? {},
    status: data.status ?? "untested",
    configuredAt: new Date(),
  });
}

/**
 * Update an integration with new data.
 */
export function updateIntegration(
  integration: Integration,
  updates: UpdateIntegration
): Integration {
  return IntegrationSchema.parse({
    ...integration,
    ...updates,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if an integration is healthy.
 */
export function isIntegrationHealthy(integration: Integration): boolean {
  return integration.enabled && integration.status === "healthy";
}

/**
 * Check if an integration needs testing.
 */
export function needsTesting(integration: Integration): boolean {
  if (integration.status === "untested") return true;
  if (!integration.lastTestedAt) return true;

  // Consider stale if not tested in the last 24 hours
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return integration.lastTestedAt.getTime() < oneDayAgo;
}

/**
 * Update integration status after health check.
 */
export function updateHealthStatus(
  integration: Integration,
  healthy: boolean,
  error?: string
): Integration {
  return updateIntegration(integration, {
    status: healthy ? "healthy" : "unhealthy",
    lastTestedAt: new Date(),
    lastError: healthy ? undefined : error,
  });
}

/**
 * Get integrations by category.
 */
export function getIntegrationCategory(type: IntegrationType): string {
  return INTEGRATION_CATEGORIES[type];
}

/**
 * Check if integration type is for source control.
 */
export function isSourceControlIntegration(type: IntegrationType): boolean {
  return INTEGRATION_CATEGORIES[type] === "source-control";
}

/**
 * Check if integration type is for issue tracking.
 */
export function isIssueTrackingIntegration(type: IntegrationType): boolean {
  return INTEGRATION_CATEGORIES[type] === "issue-tracking";
}

/**
 * Check if integration type is for communication.
 */
export function isCommunicationIntegration(type: IntegrationType): boolean {
  return INTEGRATION_CATEGORIES[type] === "communication";
}
