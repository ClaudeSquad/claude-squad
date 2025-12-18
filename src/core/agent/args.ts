/**
 * Claude CLI Argument Builder
 *
 * Constructs command-line arguments for spawning Claude CLI processes.
 * Handles all CLI options including model selection, tool permissions,
 * session management, and agent definition injection.
 *
 * @module core/agent/args
 */

import type { SpawnOptions } from "./types.js";
import type { Agent } from "../entities/agent.js";
import { AGENT_ROLE_DESCRIPTIONS } from "../entities/agent.js";

// ============================================================================
// Model Name Mapping
// ============================================================================

/**
 * Model shortname to full model ID mapping.
 *
 * Maps user-friendly model names to their official Claude model identifiers.
 */
const MODEL_NAME_MAP: Record<string, string> = {
  sonnet: "claude-sonnet-4-20250514",
  opus: "claude-opus-4-20250514",
  haiku: "claude-haiku-3-5-20250620",
};

/**
 * Get the full model name from a shortname or pass through the full name.
 *
 * @param model - Model shortname (sonnet, opus, haiku) or full model ID
 * @returns Full model identifier for Claude CLI
 *
 * @example
 * ```typescript
 * getModelName("sonnet"); // "claude-sonnet-4-20250514"
 * getModelName("claude-sonnet-4-20250514"); // "claude-sonnet-4-20250514"
 * getModelName("custom-model"); // "custom-model"
 * ```
 */
export function getModelName(model: string): string {
  return MODEL_NAME_MAP[model.toLowerCase()] ?? model;
}

// ============================================================================
// Agent Definition Building
// ============================================================================

/**
 * Agent definition structure for the --agents flag.
 *
 * This is the JSON structure expected by Claude CLI's --agents parameter.
 */
export interface AgentDefinition {
  /** Description of the agent's role and capabilities */
  description: string;
  /** List of allowed tools for this agent */
  tools?: string[];
  /** Model to use for this agent */
  model?: string;
}

/**
 * Build the agent definition JSON for the --agents flag.
 *
 * Creates a structured definition object that can be serialized to JSON
 * and passed to Claude CLI to configure agent behavior.
 *
 * @param agent - The agent entity to build a definition for
 * @returns Record containing the agent name mapped to its definition
 *
 * @example
 * ```typescript
 * const agent = { name: "backend-dev", role: "engineering", tools: ["Read", "Write"] };
 * buildAgentDefinition(agent);
 * // {
 * //   "backend-dev": {
 * //     description: "Full-stack software engineer for implementation tasks",
 * //     tools: ["Read", "Write"],
 * //     model: "claude-sonnet-4-20250514"
 * //   }
 * // }
 * ```
 */
export function buildAgentDefinition(
  agent: Agent
): Record<string, AgentDefinition> {
  const definition: AgentDefinition = {
    description: agent.systemPrompt || AGENT_ROLE_DESCRIPTIONS[agent.role],
  };

  // Add tools if agent has any configured
  if (agent.tools && agent.tools.length > 0) {
    definition.tools = agent.tools;
  }

  // Add model if agent has a specific model configured
  if (agent.model) {
    definition.model = getModelName(agent.model);
  }

  return {
    [agent.name]: definition,
  };
}

// ============================================================================
// Argument Building
// ============================================================================

/**
 * Check if an agent requires a custom definition via --agents flag.
 *
 * An agent needs a custom definition if it has:
 * - A custom system prompt
 * - Specific tools assigned
 * - Skills assigned (which affect its capabilities)
 * - A non-default model
 *
 * @param agent - The agent to check
 * @returns True if the agent needs an --agents definition
 */
function needsAgentDefinition(agent: Agent): boolean {
  return (
    Boolean(agent.systemPrompt) ||
    (agent.tools && agent.tools.length > 0) ||
    (agent.skills && agent.skills.length > 0) ||
    Boolean(agent.model)
  );
}

/**
 * Build Claude CLI command-line arguments from spawn options.
 *
 * Constructs a complete argument array for spawning a Claude CLI process.
 * Arguments are added in a specific order for consistency and predictability.
 *
 * Argument order:
 * 1. -p (print/non-interactive mode)
 * 2. --output-format stream-json
 * 3. --model (if specified)
 * 4. --allowedTools (if specified)
 * 5. --disallowedTools (if specified)
 * 6. --max-turns (if specified)
 * 7. --system-prompt (if specified)
 * 8. --append-system-prompt (if specified)
 * 9. --resume (if resuming a session)
 * 10. --verbose (if enabled)
 * 11. --dangerously-skip-permissions (if enabled)
 * 12. --permission-mode (if specified)
 * 13. --agents (if agent has custom configuration)
 * 14. Task prompt (final positional argument)
 *
 * @param options - Spawn options containing agent config and task
 * @returns Array of command-line arguments for Claude CLI
 *
 * @example
 * ```typescript
 * const args = buildClaudeArgs({
 *   agent: myAgent,
 *   task: "Implement the authentication feature",
 *   cwd: "/path/to/project",
 *   model: "sonnet",
 *   allowedTools: ["Read", "Write", "Grep"],
 *   maxTurns: 50,
 * });
 * // [
 * //   "-p",
 * //   "--output-format", "stream-json",
 * //   "--model", "claude-sonnet-4-20250514",
 * //   "--allowedTools", "Read,Write,Grep",
 * //   "--max-turns", "50",
 * //   "Implement the authentication feature"
 * // ]
 * ```
 */
export function buildClaudeArgs(options: SpawnOptions): string[] {
  const args: string[] = [];

  // 1. Always include print mode (non-interactive)
  args.push("-p");

  // 2. Always include stream-json output format
  args.push("--output-format", "stream-json");

  // 3. Model selection (options override agent config)
  const model = options.model ?? options.agent.model;
  if (model) {
    args.push("--model", getModelName(model));
  }

  // 4. Allowed tools whitelist
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push("--allowedTools", options.allowedTools.join(","));
  }

  // 5. Disallowed tools blacklist
  if (options.disallowedTools && options.disallowedTools.length > 0) {
    args.push("--disallowedTools", options.disallowedTools.join(","));
  }

  // 6. Maximum conversation turns (options override agent config)
  const maxTurns = options.maxTurns ?? options.agent.config?.maxTurns;
  if (maxTurns !== undefined && maxTurns > 0) {
    args.push("--max-turns", String(maxTurns));
  }

  // 7. System prompt override
  if (options.systemPrompt) {
    args.push("--system-prompt", options.systemPrompt);
  }

  // 8. Append to system prompt
  if (options.appendSystemPrompt) {
    args.push("--append-system-prompt", options.appendSystemPrompt);
  }

  // 9. Resume existing session
  if (options.sessionId) {
    args.push("--resume", options.sessionId);
  }

  // 10. Verbose output (options override agent config)
  const verbose = options.verbose ?? options.agent.config?.verbose;
  if (verbose) {
    args.push("--verbose");
  }

  // 11. Skip permission prompts (dangerous!)
  if (options.dangerouslySkipPermissions) {
    args.push("--dangerously-skip-permissions");
  }

  // 12. Permission mode (options override agent config)
  const permissionMode =
    options.permissionMode ?? options.agent.config?.permissionMode;
  if (permissionMode && permissionMode !== "default") {
    args.push("--permission-mode", permissionMode);
  }

  // 13. Agent definition (for custom configuration)
  if (needsAgentDefinition(options.agent)) {
    const agentDef = buildAgentDefinition(options.agent);
    args.push("--agents", JSON.stringify(agentDef));
  }

  // 14. Task prompt as final positional argument
  args.push(options.task);

  return args;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get a list of all available model shortnames.
 *
 * @returns Array of valid model shortnames
 */
export function getAvailableModelShortnames(): string[] {
  return Object.keys(MODEL_NAME_MAP);
}

/**
 * Check if a model name is a valid shortname.
 *
 * @param model - The model name to check
 * @returns True if the model is a recognized shortname
 */
export function isModelShortname(model: string): boolean {
  return model.toLowerCase() in MODEL_NAME_MAP;
}

/**
 * Build a minimal set of arguments for testing/debugging.
 *
 * Creates a simplified argument set without agent definitions
 * or advanced options, useful for quick testing.
 *
 * @param task - The task prompt
 * @param model - Optional model to use
 * @returns Minimal argument array
 */
export function buildMinimalArgs(task: string, model?: string): string[] {
  const args = ["-p", "--output-format", "stream-json"];

  if (model) {
    args.push("--model", getModelName(model));
  }

  args.push(task);

  return args;
}
