/**
 * Agent Entity
 *
 * Represents an AI agent instance in the Claude Squad system.
 * Agents are specialized personas with defined roles, tools, and skills
 * that work on specific aspects of a project.
 */

import { z } from "zod";
import type { AgentId, SessionId, SkillId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema, ModelSchema } from "../types/common";

// ============================================================================
// Agent Role
// ============================================================================

/**
 * Specialized roles that agents can take.
 * Each role comes with domain-specific knowledge and capabilities.
 */
export const AgentRoleSchema = z.enum([
  "engineering",
  "architecture-design",
  "quality-assurance",
  "security",
  "infrastructure-devops",
  "data-ai-ml",
  "design-ux",
  "documentation-knowledge",
  "strategic-planning",
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

/**
 * Human-readable descriptions for each agent role.
 */
export const AGENT_ROLE_DESCRIPTIONS: Record<AgentRole, string> = {
  engineering: "Full-stack software engineer for implementation tasks",
  "architecture-design": "System architect for design and technical decisions",
  "quality-assurance": "QA engineer for testing and quality validation",
  security: "Security specialist for vulnerability assessment",
  "infrastructure-devops": "DevOps engineer for deployment and infrastructure",
  "data-ai-ml": "Data scientist for ML/AI and data processing tasks",
  "design-ux": "UX designer for user experience and interface design",
  "documentation-knowledge": "Technical writer for documentation",
  "strategic-planning": "Product strategist for planning and roadmaps",
};

// ============================================================================
// Agent Status
// ============================================================================

/**
 * Agent lifecycle states.
 */
export const AgentStatusSchema = z.enum([
  "idle",
  "working",
  "waiting",
  "paused",
  "error",
  "completed",
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

/**
 * Status descriptions for UI display.
 */
export const AGENT_STATUS_DESCRIPTIONS: Record<AgentStatus, string> = {
  idle: "Agent is ready but not currently working",
  working: "Agent is actively processing a task",
  waiting: "Agent is waiting for user input",
  paused: "Agent has been paused by the user",
  error: "Agent encountered an error",
  completed: "Agent has completed its task",
};

// ============================================================================
// Agent Config
// ============================================================================

/**
 * Additional agent configuration options.
 */
export const AgentConfigSchema = z.object({
  /** Maximum conversation turns before auto-stop */
  maxTurns: z.number().int().positive().default(50),
  /** Timeout in milliseconds for agent operations */
  timeout: z.number().int().positive().default(300000), // 5 minutes
  /** Whether to enable verbose logging */
  verbose: z.boolean().default(false),
  /** Custom environment variables */
  env: z.record(z.string()).optional(),
  /** Permission mode for tool execution */
  permissionMode: z.enum(["default", "strict", "permissive"]).default("default"),
});
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// ============================================================================
// Agent Entity
// ============================================================================

/**
 * ID validation patterns.
 */
const AgentIdPattern = createIdPattern("agt");
const SessionIdPattern = createIdPattern("ses");
const SkillIdPattern = createIdPattern("skl");

/**
 * Agent entity schema.
 */
export const AgentSchema = z.object({
  /** Unique agent identifier */
  id: z.string().regex(AgentIdPattern, "Invalid AgentId format"),
  /** Parent session reference */
  sessionId: z.string().regex(SessionIdPattern, "Invalid SessionId format"),
  /** Human-readable agent name */
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  /** Specialized role */
  role: AgentRoleSchema,
  /** Custom system prompt/instructions */
  systemPrompt: z.string().default(""),
  /** Current lifecycle state */
  status: AgentStatusSchema.default("idle"),
  /** Associated Git worktree path */
  worktreePath: z.string().optional(),
  /** System process ID when running */
  pid: z.number().int().positive().optional(),
  /** Assigned skill IDs */
  skills: z.array(z.string().regex(SkillIdPattern, "Invalid SkillId format")).default([]),
  /** Allowed tool names */
  tools: z.array(z.string()).default([]),
  /** Claude model to use */
  model: ModelSchema.default("sonnet"),
  /** Additional configuration */
  config: AgentConfigSchema.default({}),
  /** Creation timestamp */
  createdAt: DateSchema,
  /** Last update timestamp */
  updatedAt: DateSchema,
});

/**
 * Agent entity type (inferred from schema).
 */
export type Agent = z.infer<typeof AgentSchema>;

/**
 * Typed Agent with branded IDs.
 */
export interface TypedAgent extends Omit<Agent, "id" | "sessionId" | "skills"> {
  id: AgentId;
  sessionId: SessionId;
  skills: SkillId[];
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial agent schema for updates.
 */
export const PartialAgentSchema = AgentSchema.partial();
export type PartialAgent = z.infer<typeof PartialAgentSchema>;

/**
 * Schema for creating a new agent (auto-generates timestamps).
 */
export const CreateAgentSchema = AgentSchema.omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  createdAt: DateSchema.optional(),
  updatedAt: DateSchema.optional(),
});
export type CreateAgent = z.infer<typeof CreateAgentSchema>;

/**
 * Schema for updating an existing agent.
 */
export const UpdateAgentSchema = AgentSchema.partial().omit({
  id: true,
  sessionId: true,
  createdAt: true,
}).extend({
  updatedAt: DateSchema.optional(),
});
export type UpdateAgent = z.infer<typeof UpdateAgentSchema>;

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
export function safeValidateAgent(data: unknown): {
  success: boolean;
  data?: Agent;
  error?: z.ZodError;
} {
  const result = AgentSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new agent with defaults.
 */
export function createAgent(
  data: Omit<CreateAgent, "createdAt" | "updatedAt" | "status" | "config" | "skills" | "tools" | "systemPrompt"> &
    Partial<Pick<CreateAgent, "status" | "config" | "skills" | "tools" | "systemPrompt">>
): Agent {
  const now = new Date();
  return AgentSchema.parse({
    ...data,
    status: data.status ?? "idle",
    systemPrompt: data.systemPrompt ?? "",
    skills: data.skills ?? [],
    tools: data.tools ?? [],
    config: data.config ?? {},
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update an agent with new data.
 */
export function updateAgent(agent: Agent, updates: UpdateAgent): Agent {
  return AgentSchema.parse({
    ...agent,
    ...updates,
    updatedAt: new Date(),
  });
}
