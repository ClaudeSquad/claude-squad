/**
 * Context Builder
 *
 * Aggregates handoff chains into structured context for agent prompts.
 * Compresses and formats handoff history for optimal agent consumption.
 */

import type { Handoff, HandoffContent, HandoffType } from "../entities/handoff.js";
import type {
  HandoffYaml,
  HandoffContext,
  FileModified,
  NextStep,
  Blocker,
  HandoffDecision,
} from "./schema.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Aggregated context from multiple handoffs
 */
export interface AggregatedContext {
  /** Summary of work completed across all handoffs */
  summary: string;
  /** All decisions made across handoffs */
  decisions: HandoffDecision[];
  /** Current state of the feature */
  currentState: {
    phase: string;
    progress: number;
    status: string;
  };
  /** All files modified across handoffs */
  filesModified: FileModified[];
  /** Outstanding next steps */
  nextSteps: NextStep[];
  /** Active blockers */
  blockers: Blocker[];
  /** Architecture summary if available */
  architectureSummary?: string;
  /** API contracts if available */
  apiContracts?: string[];
  /** Database schema if available */
  databaseSchema?: string;
  /** Dependencies added */
  dependencies?: string[];
  /** Environment variables needed */
  environmentVariables?: string[];
}

/**
 * Options for building context
 */
export interface BuildContextOptions {
  /** Maximum length of the summary section */
  maxSummaryLength?: number;
  /** Maximum number of decisions to include */
  maxDecisions?: number;
  /** Maximum number of files to list */
  maxFiles?: number;
  /** Include architecture details */
  includeArchitecture?: boolean;
  /** Include API contracts */
  includeApiContracts?: boolean;
  /** Include test recommendations */
  includeTestRecommendations?: boolean;
  /** Filter by handoff types */
  types?: HandoffType[];
  /** Format for the output */
  format?: "yaml" | "markdown" | "text";
}

/**
 * Formatted context output for agent prompt
 */
export interface FormattedContext {
  /** The formatted context string */
  content: string;
  /** Format type */
  format: "yaml" | "markdown" | "text";
  /** Character count */
  charCount: number;
  /** Number of handoffs included */
  handoffCount: number;
  /** Metadata about the context */
  metadata: {
    featureId: string;
    stageCount: number;
    totalFilesChanged: number;
    hasBlockers: boolean;
    hasUnresolvedIssues: boolean;
  };
}

// ============================================================================
// Context Builder
// ============================================================================

/**
 * Context Builder
 *
 * Aggregates and formats handoff chains into optimal context for agent prompts.
 * Handles compression, deduplication, and intelligent summarization of
 * handoff history to provide agents with relevant context without overload.
 *
 * @example
 * ```typescript
 * const builder = new ContextBuilder();
 *
 * // Build context from handoff chain
 * const context = builder.aggregate(handoffChain);
 *
 * // Format for agent prompt
 * const formatted = builder.format(context, {
 *   format: 'markdown',
 *   maxSummaryLength: 1000,
 *   includeArchitecture: true,
 * });
 *
 * // Use in agent prompt
 * const prompt = `Here is the context from previous work:\n${formatted.content}`;
 * ```
 */
export class ContextBuilder {
  // ==========================================================================
  // Aggregation
  // ==========================================================================

  /**
   * Aggregate a chain of handoffs into unified context
   *
   * @param handoffs - Array of handoffs in chronological order
   * @param options - Build options
   * @returns Aggregated context
   */
  aggregate(handoffs: Handoff[], options: BuildContextOptions = {}): AggregatedContext {
    const filteredHandoffs = options.types
      ? handoffs.filter((h) => options.types?.includes(h.type))
      : handoffs;

    if (filteredHandoffs.length === 0) {
      return this.emptyContext();
    }

    // Build summary from all handoffs
    const summaries = filteredHandoffs
      .map((h) => h.content.architectureSummary)
      .filter(Boolean) as string[];
    const summary = this.buildSummary(summaries, options.maxSummaryLength ?? 500);

    // Collect all decisions
    const decisions = this.collectDecisions(filteredHandoffs, options.maxDecisions ?? 20);

    // Determine current state from latest handoff
    const latestHandoff = filteredHandoffs[filteredHandoffs.length - 1]!;
    const currentState = this.extractCurrentState(latestHandoff);

    // Collect all file changes (deduplicated)
    const filesModified = this.collectFileChanges(
      filteredHandoffs,
      options.maxFiles ?? 50
    );

    // Collect next steps (remove completed ones)
    const nextSteps = this.collectNextSteps(filteredHandoffs);

    // Collect active blockers
    const blockers = this.collectBlockers(filteredHandoffs);

    // Collect architecture info
    const architectureSummary = options.includeArchitecture
      ? this.findArchitectureSummary(filteredHandoffs)
      : undefined;

    // Collect API contracts
    const apiContracts = options.includeApiContracts
      ? this.collectApiContracts(filteredHandoffs)
      : undefined;

    // Collect database schema
    const databaseSchema = this.findDatabaseSchema(filteredHandoffs);

    // Collect dependencies
    const dependencies = this.collectDependencies(filteredHandoffs);

    // Collect environment variables
    const environmentVariables = this.collectEnvironmentVariables(filteredHandoffs);

    return {
      summary,
      decisions,
      currentState,
      filesModified,
      nextSteps,
      blockers,
      architectureSummary,
      apiContracts,
      databaseSchema,
      dependencies,
      environmentVariables,
    };
  }

  /**
   * Aggregate from HandoffYaml objects (file-based handoffs)
   *
   * @param handoffYamls - Array of HandoffYaml objects
   * @param options - Build options
   * @returns Aggregated context
   */
  aggregateFromYaml(
    handoffYamls: HandoffYaml[],
    options: BuildContextOptions = {}
  ): AggregatedContext {
    if (handoffYamls.length === 0) {
      return this.emptyContext();
    }

    // Build summary
    const summaries = handoffYamls.map((h) => h.context.summary);
    const summary = this.buildSummary(summaries, options.maxSummaryLength ?? 500);

    // Collect decisions
    const decisions = handoffYamls
      .flatMap((h) => h.context.decisions)
      .slice(0, options.maxDecisions ?? 20);

    // Get current state from latest
    const latestYaml = handoffYamls[handoffYamls.length - 1]!;
    const currentState = latestYaml.context.currentState;

    // Collect files
    const filesModified = handoffYamls
      .flatMap((h) => h.filesModified)
      .slice(0, options.maxFiles ?? 50);

    // Collect next steps
    const nextSteps = handoffYamls.flatMap((h) => h.nextSteps);

    // Collect blockers
    const blockers = handoffYamls.flatMap((h) => h.blockers);

    return {
      summary,
      decisions,
      currentState: {
        phase: currentState.phase,
        progress: currentState.progress,
        status: currentState.status,
      },
      filesModified,
      nextSteps,
      blockers,
    };
  }

  // ==========================================================================
  // Formatting
  // ==========================================================================

  /**
   * Format aggregated context for agent prompt
   *
   * @param context - Aggregated context
   * @param options - Format options
   * @returns Formatted context string
   */
  format(
    context: AggregatedContext,
    featureId: string,
    options: BuildContextOptions = {}
  ): FormattedContext {
    const format = options.format ?? "markdown";
    let content: string;

    switch (format) {
      case "yaml":
        content = this.formatAsYaml(context);
        break;
      case "text":
        content = this.formatAsText(context);
        break;
      case "markdown":
      default:
        content = this.formatAsMarkdown(context);
        break;
    }

    return {
      content,
      format,
      charCount: content.length,
      handoffCount: context.decisions.length > 0 ? context.decisions.length : 1,
      metadata: {
        featureId,
        stageCount: context.decisions.length,
        totalFilesChanged: context.filesModified.length,
        hasBlockers: context.blockers.length > 0,
        hasUnresolvedIssues: context.blockers.some((b) => b.severity === "critical"),
      },
    };
  }

  /**
   * Format context as Markdown
   */
  private formatAsMarkdown(context: AggregatedContext): string {
    const sections: string[] = [];

    // Summary
    sections.push("## Summary\n");
    sections.push(context.summary);
    sections.push("");

    // Current State
    sections.push("## Current State\n");
    sections.push(`- **Phase:** ${context.currentState.phase}`);
    sections.push(`- **Progress:** ${context.currentState.progress}%`);
    sections.push(`- **Status:** ${context.currentState.status}`);
    sections.push("");

    // Decisions
    if (context.decisions.length > 0) {
      sections.push("## Key Decisions\n");
      for (const decision of context.decisions) {
        sections.push(`### ${decision.title}`);
        sections.push(`**Decision:** ${decision.decision}`);
        if (decision.rationale) {
          sections.push(`**Rationale:** ${decision.rationale}`);
        }
        if (decision.alternatives && decision.alternatives.length > 0) {
          sections.push(`**Alternatives considered:** ${decision.alternatives.join(", ")}`);
        }
        sections.push("");
      }
    }

    // Architecture
    if (context.architectureSummary) {
      sections.push("## Architecture\n");
      sections.push(context.architectureSummary);
      sections.push("");
    }

    // Files Modified
    if (context.filesModified.length > 0) {
      sections.push("## Files Modified\n");
      for (const file of context.filesModified) {
        const stats =
          file.linesAdded !== undefined || file.linesRemoved !== undefined
            ? ` (+${file.linesAdded ?? 0}/-${file.linesRemoved ?? 0})`
            : "";
        sections.push(`- \`${file.path}\` [${file.changeType}]${stats}: ${file.description}`);
      }
      sections.push("");
    }

    // Next Steps
    if (context.nextSteps.length > 0) {
      sections.push("## Next Steps\n");
      for (const step of context.nextSteps) {
        const priority = step.priority === "urgent" ? "**URGENT**" : `[${step.priority}]`;
        sections.push(`- ${priority} ${step.description}`);
        if (step.estimatedEffort) {
          sections.push(`  - Estimated: ${step.estimatedEffort}`);
        }
      }
      sections.push("");
    }

    // Blockers
    if (context.blockers.length > 0) {
      sections.push("## Blockers\n");
      for (const blocker of context.blockers) {
        const severity =
          blocker.severity === "critical"
            ? "**CRITICAL**"
            : `[${blocker.severity}]`;
        sections.push(`- ${severity} ${blocker.description}`);
        if (blocker.suggestedResolution) {
          sections.push(`  - Suggested: ${blocker.suggestedResolution}`);
        }
      }
      sections.push("");
    }

    // Dependencies
    if (context.dependencies && context.dependencies.length > 0) {
      sections.push("## Dependencies Added\n");
      for (const dep of context.dependencies) {
        sections.push(`- ${dep}`);
      }
      sections.push("");
    }

    // Environment Variables
    if (context.environmentVariables && context.environmentVariables.length > 0) {
      sections.push("## Environment Variables\n");
      for (const envVar of context.environmentVariables) {
        sections.push(`- \`${envVar}\``);
      }
      sections.push("");
    }

    return sections.join("\n").trim();
  }

  /**
   * Format context as YAML
   */
  private formatAsYaml(context: AggregatedContext): string {
    const yamlObj = {
      summary: context.summary,
      currentState: context.currentState,
      decisions: context.decisions,
      filesModified: context.filesModified.map((f) => ({
        path: f.path,
        changeType: f.changeType,
        description: f.description,
      })),
      nextSteps: context.nextSteps.map((s) => ({
        priority: s.priority,
        description: s.description,
      })),
      blockers: context.blockers.map((b) => ({
        severity: b.severity,
        description: b.description,
      })),
    };

    // Simple YAML formatting (could use yaml library for better output)
    return this.simpleYamlStringify(yamlObj);
  }

  /**
   * Format context as plain text
   */
  private formatAsText(context: AggregatedContext): string {
    const lines: string[] = [];

    lines.push("HANDOFF CONTEXT");
    lines.push("===============");
    lines.push("");
    lines.push("SUMMARY:");
    lines.push(context.summary);
    lines.push("");
    lines.push(`CURRENT STATE: ${context.currentState.phase} (${context.currentState.progress}% - ${context.currentState.status})`);
    lines.push("");

    if (context.decisions.length > 0) {
      lines.push("DECISIONS:");
      for (const d of context.decisions) {
        lines.push(`  * ${d.title}: ${d.decision}`);
      }
      lines.push("");
    }

    if (context.filesModified.length > 0) {
      lines.push("FILES CHANGED:");
      for (const f of context.filesModified) {
        lines.push(`  ${f.changeType.toUpperCase()}: ${f.path}`);
      }
      lines.push("");
    }

    if (context.nextSteps.length > 0) {
      lines.push("NEXT STEPS:");
      for (const s of context.nextSteps) {
        lines.push(`  [${s.priority}] ${s.description}`);
      }
      lines.push("");
    }

    if (context.blockers.length > 0) {
      lines.push("BLOCKERS:");
      for (const b of context.blockers) {
        lines.push(`  [${b.severity}] ${b.description}`);
      }
      lines.push("");
    }

    return lines.join("\n").trim();
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Create empty context
   */
  private emptyContext(): AggregatedContext {
    return {
      summary: "No previous handoff context available.",
      decisions: [],
      currentState: {
        phase: "initial",
        progress: 0,
        status: "starting",
      },
      filesModified: [],
      nextSteps: [],
      blockers: [],
    };
  }

  /**
   * Build a combined summary from multiple summaries
   */
  private buildSummary(summaries: string[], maxLength: number): string {
    if (summaries.length === 0) {
      return "No summary available.";
    }

    if (summaries.length === 1) {
      const summary = summaries[0]!;
      return summary.length > maxLength
        ? summary.substring(0, maxLength - 3) + "..."
        : summary;
    }

    // Combine summaries with stage markers
    const combined = summaries
      .map((s, i) => `Stage ${i + 1}: ${s}`)
      .join("\n\n");

    if (combined.length <= maxLength) {
      return combined;
    }

    // Truncate if too long
    return combined.substring(0, maxLength - 3) + "...";
  }

  /**
   * Collect decisions from handoffs
   */
  private collectDecisions(handoffs: Handoff[], maxCount: number): HandoffDecision[] {
    const decisions: HandoffDecision[] = [];

    for (const handoff of handoffs) {
      const notes = handoff.content.implementationNotes ?? [];
      for (const note of notes) {
        // Parse decision format "Title: Decision (Rationale)"
        const match = note.match(/^(.+?):\s*(.+?)(?:\s*\((.+)\))?$/);
        if (match) {
          decisions.push({
            title: match[1] ?? "Decision",
            decision: match[2] ?? note,
            rationale: match[3],
          });
        } else {
          decisions.push({
            title: "Implementation Note",
            decision: note,
          });
        }
      }
    }

    return decisions.slice(0, maxCount);
  }

  /**
   * Extract current state from a handoff
   */
  private extractCurrentState(handoff: Handoff): {
    phase: string;
    progress: number;
    status: string;
  } {
    // Map handoff type to phase
    const phaseMap: Record<HandoffType, string> = {
      architecture: "design",
      implementation: "implementation",
      review_feedback: "review",
      test_plan: "testing",
      deployment: "deployment",
    };

    return {
      phase: phaseMap[handoff.type] ?? "unknown",
      progress: handoff.isRead ? 100 : 50,
      status: handoff.isRead ? "complete" : "in-progress",
    };
  }

  /**
   * Collect file changes (deduplicated by path, keeping latest)
   */
  private collectFileChanges(
    handoffs: Handoff[],
    maxCount: number
  ): FileModified[] {
    const fileMap = new Map<string, FileModified>();

    for (const handoff of handoffs) {
      const content = handoff.content;

      for (const path of content.filesCreated ?? []) {
        fileMap.set(path, {
          path,
          description: "Created",
          changeType: "created",
        });
      }

      for (const path of content.filesModified ?? []) {
        const existing = fileMap.get(path);
        if (!existing || existing.changeType !== "created") {
          fileMap.set(path, {
            path,
            description: "Modified",
            changeType: "modified",
          });
        }
      }

      for (const path of content.filesDeleted ?? []) {
        fileMap.set(path, {
          path,
          description: "Deleted",
          changeType: "deleted",
        });
      }
    }

    return Array.from(fileMap.values()).slice(0, maxCount);
  }

  /**
   * Collect next steps (filtering out likely completed ones)
   */
  private collectNextSteps(handoffs: Handoff[]): NextStep[] {
    // Only take next steps from the latest handoff
    if (handoffs.length === 0) return [];

    const latest = handoffs[handoffs.length - 1]!;
    const reviewFeedback = latest.content.reviewFeedback;

    if (!reviewFeedback) return [];

    // Convert recommendations to next steps
    return reviewFeedback.recommendations.map((rec) => ({
      priority: "normal" as const,
      description: rec,
    }));
  }

  /**
   * Collect blockers (active/unresolved only)
   */
  private collectBlockers(handoffs: Handoff[]): Blocker[] {
    // Only take blockers from the latest handoff
    if (handoffs.length === 0) return [];

    const latest = handoffs[handoffs.length - 1]!;
    const reviewFeedback = latest.content.reviewFeedback;

    if (!reviewFeedback || reviewFeedback.approved) return [];

    // Convert critical issues to blockers
    return reviewFeedback.issues
      .filter((issue) => issue.severity === "critical" || issue.severity === "high")
      .map((issue) => ({
        severity: issue.severity,
        description: `${issue.file}${issue.line ? `:${issue.line}` : ""} - ${issue.description}`,
        suggestedResolution: issue.suggestedFix,
        relatedTo: issue.file,
      }));
  }

  /**
   * Find architecture summary from handoffs
   */
  private findArchitectureSummary(handoffs: Handoff[]): string | undefined {
    // Look for architecture type handoff first
    const archHandoff = handoffs.find((h) => h.type === "architecture");
    if (archHandoff?.content.architectureSummary) {
      return archHandoff.content.architectureSummary;
    }

    // Otherwise find any architectureSummary
    for (const handoff of handoffs) {
      if (handoff.content.architectureSummary) {
        return handoff.content.architectureSummary;
      }
    }

    return undefined;
  }

  /**
   * Collect API contracts from handoffs
   */
  private collectApiContracts(handoffs: Handoff[]): string[] {
    const contracts: string[] = [];

    for (const handoff of handoffs) {
      const apiContracts = handoff.content.apiContracts ?? [];
      for (const contract of apiContracts) {
        contracts.push(
          `${contract.method} ${contract.path}${contract.description ? ` - ${contract.description}` : ""}`
        );
      }
    }

    return contracts;
  }

  /**
   * Find database schema from handoffs
   */
  private findDatabaseSchema(handoffs: Handoff[]): string | undefined {
    for (const handoff of handoffs) {
      if (handoff.content.databaseSchema) {
        return handoff.content.databaseSchema;
      }
    }
    return undefined;
  }

  /**
   * Collect dependencies from handoffs
   */
  private collectDependencies(handoffs: Handoff[]): string[] {
    const deps = new Set<string>();

    for (const handoff of handoffs) {
      for (const dep of handoff.content.dependenciesAdded ?? []) {
        deps.add(dep);
      }
    }

    return Array.from(deps);
  }

  /**
   * Collect environment variables from handoffs
   */
  private collectEnvironmentVariables(handoffs: Handoff[]): string[] {
    const vars = new Set<string>();

    for (const handoff of handoffs) {
      for (const envVar of handoff.content.environmentVariables ?? []) {
        vars.add(envVar);
      }
    }

    return Array.from(vars);
  }

  /**
   * Simple YAML stringification (basic implementation)
   */
  private simpleYamlStringify(obj: Record<string, unknown>, indent = 0): string {
    const lines: string[] = [];
    const prefix = "  ".repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      if (typeof value === "string") {
        // Handle multiline strings
        if (value.includes("\n")) {
          lines.push(`${prefix}${key}: |`);
          for (const line of value.split("\n")) {
            lines.push(`${prefix}  ${line}`);
          }
        } else {
          lines.push(`${prefix}${key}: ${value}`);
        }
      } else if (typeof value === "number" || typeof value === "boolean") {
        lines.push(`${prefix}${key}: ${value}`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${prefix}${key}: []`);
        } else if (typeof value[0] === "object") {
          lines.push(`${prefix}${key}:`);
          for (const item of value) {
            lines.push(`${prefix}  -`);
            const nested = this.simpleYamlStringify(
              item as Record<string, unknown>,
              indent + 2
            );
            lines.push(nested);
          }
        } else {
          lines.push(`${prefix}${key}:`);
          for (const item of value) {
            lines.push(`${prefix}  - ${item}`);
          }
        }
      } else if (typeof value === "object") {
        lines.push(`${prefix}${key}:`);
        lines.push(this.simpleYamlStringify(value as Record<string, unknown>, indent + 1));
      }
    }

    return lines.join("\n");
  }
}

/**
 * Create a ContextBuilder instance
 */
export function createContextBuilder(): ContextBuilder {
  return new ContextBuilder();
}
