/**
 * Handoff Service
 *
 * Core service for creating, reading, and managing handoffs between workflow stages.
 * Coordinates between database persistence and YAML file storage.
 */

import type { EventBus } from "../../infra/events/event-bus.js";
import type { FileSystemService } from "../../infra/fs/service.js";
import type { GitService } from "../../infra/git/service.js";
import type { HandoffRepository } from "../../infra/database/repositories/handoff.repository.js";
import type {
  Handoff,
  CreateHandoff,
  HandoffType,
  HandoffContent,
} from "../entities/handoff.js";
import type { HandoffId, AgentId, FeatureId, StageId } from "../types/id.js";
import { generateHandoffId } from "../types/id.js";
import { createEvent } from "../../infra/events/types.js";
import {
  type HandoffYaml,
  type HandoffAgentInfo,
  type HandoffDestination,
  type HandoffContext,
  type FileModified,
  type NextStep,
  type Blocker,
  type GitState,
  createHandoffYaml,
  validateHandoffYaml,
  safeValidateHandoffYaml,
  getHandoffYamlPath,
  getStageHandoffPath,
  getHandoffDirPath,
} from "./schema.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Options for creating a handoff
 */
export interface CreateHandoffOptions {
  /** Source agent information */
  fromAgent: HandoffAgentInfo;
  /** Destination agent (specific agent or "any") */
  toAgent?: HandoffDestination;
  /** Feature this handoff belongs to */
  featureId: string;
  /** Stage this handoff belongs to */
  stageId?: string;
  /** Session ID */
  sessionId?: string;
  /** Handoff type */
  type: HandoffType;
  /** Context about completed work */
  context: HandoffContext;
  /** Files modified during this stage */
  filesModified?: FileModified[];
  /** Next steps for the receiving agent */
  nextSteps?: NextStep[];
  /** Blocking issues */
  blockers?: Blocker[];
  /** Worktree path where handoff file should be written */
  worktreePath?: string;
  /** Whether to auto-capture git state */
  captureGitState?: boolean;
  /** Additional metadata */
  durationMs?: number;
  tokensUsed?: number;
  costUsd?: number;
}

/**
 * Options for reading a handoff
 */
export interface ReadHandoffOptions {
  /** Mark the handoff as read */
  markAsRead?: boolean;
  /** Agent ID that is reading */
  readerId?: string;
}

/**
 * Handoff service dependencies
 */
export interface HandoffServiceDeps {
  handoffRepository: HandoffRepository;
  fileSystem: FileSystemService;
  git: GitService;
  eventBus: EventBus;
}

// ============================================================================
// Handoff Service
// ============================================================================

/**
 * Handoff Service
 *
 * Manages the lifecycle of handoffs including:
 * - Creating handoffs with database persistence and YAML file generation
 * - Reading handoffs from files or database
 * - Capturing git state at handoff time
 * - Emitting events for handoff creation and reading
 *
 * @example
 * ```typescript
 * const handoffService = new HandoffService({
 *   handoffRepository,
 *   fileSystem,
 *   git,
 *   eventBus,
 * });
 *
 * // Create a handoff
 * const handoff = await handoffService.create({
 *   fromAgent: { id: 'agt_123', name: 'Architect', role: 'architect' },
 *   featureId: 'ftr_456',
 *   stageId: 'stg_789',
 *   type: 'architecture',
 *   context: {
 *     summary: 'Completed API design',
 *     decisions: [{ title: 'REST over GraphQL', decision: 'Use REST', rationale: 'Simpler' }],
 *     currentState: { phase: 'design', progress: 100, status: 'complete' },
 *   },
 *   worktreePath: '/path/to/worktree',
 *   captureGitState: true,
 * });
 * ```
 */
export class HandoffService {
  private readonly repo: HandoffRepository;
  private readonly fs: FileSystemService;
  private readonly git: GitService;
  private readonly eventBus: EventBus;

  constructor(deps: HandoffServiceDeps) {
    this.repo = deps.handoffRepository;
    this.fs = deps.fileSystem;
    this.git = deps.git;
    this.eventBus = deps.eventBus;
  }

  // ==========================================================================
  // Create Operations
  // ==========================================================================

  /**
   * Create a new handoff
   *
   * Creates a handoff record in the database and optionally writes
   * a HANDOFF.yaml file to the worktree.
   *
   * @param options - Handoff creation options
   * @returns Created handoff entity
   */
  async create(options: CreateHandoffOptions): Promise<Handoff> {
    const handoffId = generateHandoffId();

    // Capture git state if requested
    let gitState: GitState | undefined;
    if (options.captureGitState && options.worktreePath) {
      gitState = await this.captureGitState(options.worktreePath);
    }

    // Build the HandoffYaml structure for file
    const handoffYaml = createHandoffYaml({
      fromAgent: options.fromAgent,
      toAgent: options.toAgent,
      context: options.context,
      filesModified: options.filesModified,
      nextSteps: options.nextSteps,
      blockers: options.blockers,
      featureId: options.featureId,
      stageId: options.stageId,
      sessionId: options.sessionId,
      gitState,
      durationMs: options.durationMs,
      tokensUsed: options.tokensUsed,
      costUsd: options.costUsd,
    });

    // Determine file path
    let filePath: string | undefined;
    if (options.worktreePath) {
      filePath = options.stageId
        ? getStageHandoffPath(options.worktreePath, options.stageId)
        : getHandoffYamlPath(options.worktreePath);

      // Ensure handoff directory exists
      const handoffDir = getHandoffDirPath(options.worktreePath);
      await this.fs.ensureDir(handoffDir);

      // Write YAML file
      await this.fs.writeYaml(filePath, handoffYaml, { createDirs: true });

      // Also write to the root HANDOFF.yaml for easy access
      const rootPath = getHandoffYamlPath(options.worktreePath);
      await this.fs.writeYaml(rootPath, handoffYaml, { createDirs: true });
    }

    // Build HandoffContent for database
    const content: HandoffContent = {
      architectureSummary: options.context.summary,
      filesCreated: options.filesModified
        ?.filter((f) => f.changeType === "created")
        .map((f) => f.path),
      filesModified: options.filesModified
        ?.filter((f) => f.changeType === "modified")
        .map((f) => f.path),
      filesDeleted: options.filesModified
        ?.filter((f) => f.changeType === "deleted")
        .map((f) => f.path),
      implementationNotes: options.context.decisions?.map(
        (d) => `${d.title}: ${d.decision}${d.rationale ? ` (${d.rationale})` : ""}`
      ),
      gitDiff: gitState?.commit,
    };

    // Create database record
    const createData: CreateHandoff = {
      id: handoffId,
      fromAgent: options.fromAgent.id,
      toAgent: this.resolveToAgent(options.toAgent),
      featureId: options.featureId,
      stageId: options.stageId ?? "",
      type: options.type,
      content,
      filePath,
      isRead: false,
    };

    const handoff = await this.repo.create(createData);

    // Emit event
    this.eventBus.emit(
      createEvent({
        type: "HANDOFF_CREATED",
        path: filePath ?? "",
        fromAgentId: options.fromAgent.id,
        toAgentId: this.resolveToAgent(options.toAgent),
      })
    );

    return handoff;
  }

  /**
   * Resolve the toAgent destination to an agent ID
   */
  private resolveToAgent(toAgent?: HandoffDestination): string {
    if (!toAgent || toAgent === "any") {
      return "";
    }
    return toAgent.id;
  }

  // ==========================================================================
  // Read Operations
  // ==========================================================================

  /**
   * Read a handoff by ID
   *
   * @param id - Handoff ID
   * @param options - Read options
   * @returns Handoff entity or null
   */
  async readById(id: string, options?: ReadHandoffOptions): Promise<Handoff | null> {
    const handoff = await this.repo.findById(id);
    if (!handoff) return null;

    if (options?.markAsRead && !handoff.isRead) {
      await this.repo.markAsRead(id);
      handoff.isRead = true;
      handoff.readAt = new Date();

      // Emit read event
      this.eventBus.emit(
        createEvent({
          type: "HANDOFF_READ",
          path: handoff.filePath ?? "",
          agentId: options.readerId ?? "",
        })
      );
    }

    return handoff;
  }

  /**
   * Read a handoff YAML file from a worktree
   *
   * @param worktreePath - Path to the worktree
   * @param stageId - Optional stage ID for stage-specific handoff
   * @returns Parsed HandoffYaml or null if not found
   */
  async readFromFile(
    worktreePath: string,
    stageId?: string
  ): Promise<HandoffYaml | null> {
    const filePath = stageId
      ? getStageHandoffPath(worktreePath, stageId)
      : getHandoffYamlPath(worktreePath);

    if (!(await this.fs.exists(filePath))) {
      return null;
    }

    try {
      const data = await this.fs.readYaml(filePath);
      const result = safeValidateHandoffYaml(data);
      return result.success ? result.data ?? null : null;
    } catch {
      return null;
    }
  }

  /**
   * Read and validate a handoff YAML file
   *
   * @param filePath - Path to the YAML file
   * @returns Validated HandoffYaml
   * @throws Error if file doesn't exist or validation fails
   */
  async readAndValidateFile(filePath: string): Promise<HandoffYaml> {
    if (!(await this.fs.exists(filePath))) {
      throw new Error(`Handoff file not found: ${filePath}`);
    }

    const data = await this.fs.readYaml(filePath);
    return validateHandoffYaml(data);
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all handoffs for a feature
   *
   * @param featureId - Feature ID
   * @returns Array of handoffs
   */
  async getByFeature(featureId: string): Promise<Handoff[]> {
    return this.repo.findByFeatureId(featureId);
  }

  /**
   * Get the handoff chain for a feature (chronological order)
   *
   * @param featureId - Feature ID
   * @returns Array of handoffs in chronological order
   */
  async getChain(featureId: string): Promise<Handoff[]> {
    return this.repo.findChain(featureId);
  }

  /**
   * Get all unread handoffs for an agent
   *
   * @param agentId - Agent ID
   * @returns Array of unread handoffs
   */
  async getUnread(agentId: string): Promise<Handoff[]> {
    return this.repo.findUnread(agentId);
  }

  /**
   * Get the most recent handoff for a feature
   *
   * @param featureId - Feature ID
   * @returns Most recent handoff or null
   */
  async getLatest(featureId: string): Promise<Handoff | null> {
    return this.repo.findLatestForFeature(featureId);
  }

  /**
   * Get handoffs by stage
   *
   * @param stageId - Stage ID
   * @returns Array of handoffs for the stage
   */
  async getByStage(stageId: string): Promise<Handoff[]> {
    return this.repo.findByStageId(stageId);
  }

  /**
   * Get handoffs sent from an agent
   *
   * @param agentId - Agent ID
   * @returns Array of handoffs from the agent
   */
  async getFromAgent(agentId: string): Promise<Handoff[]> {
    return this.repo.findByFromAgent(agentId);
  }

  /**
   * Get handoffs sent to an agent
   *
   * @param agentId - Agent ID
   * @returns Array of handoffs to the agent
   */
  async getToAgent(agentId: string): Promise<Handoff[]> {
    return this.repo.findByToAgent(agentId);
  }

  // ==========================================================================
  // Update Operations
  // ==========================================================================

  /**
   * Mark a handoff as read
   *
   * @param id - Handoff ID
   * @param readerId - Agent ID that read the handoff
   */
  async markAsRead(id: string, readerId?: string): Promise<void> {
    const handoff = await this.repo.findById(id);
    if (!handoff) {
      throw new Error(`Handoff not found: ${id}`);
    }

    await this.repo.markAsRead(id);

    this.eventBus.emit(
      createEvent({
        type: "HANDOFF_READ",
        path: handoff.filePath ?? "",
        agentId: readerId ?? "",
      })
    );
  }

  /**
   * Mark all handoffs for an agent as read
   *
   * @param agentId - Agent ID
   * @returns Number of handoffs marked as read
   */
  async markAllAsRead(agentId: string): Promise<number> {
    return this.repo.markAllAsRead(agentId);
  }

  // ==========================================================================
  // Delete Operations
  // ==========================================================================

  /**
   * Delete a handoff
   *
   * @param id - Handoff ID
   */
  async delete(id: string): Promise<void> {
    const handoff = await this.repo.findById(id);
    if (!handoff) {
      throw new Error(`Handoff not found: ${id}`);
    }

    // Delete the file if it exists
    if (handoff.filePath && (await this.fs.exists(handoff.filePath))) {
      await this.fs.remove(handoff.filePath);
    }

    await this.repo.delete(id);
  }

  /**
   * Delete all handoffs for a feature
   *
   * @param featureId - Feature ID
   * @returns Number of deleted handoffs
   */
  async deleteByFeature(featureId: string): Promise<number> {
    // Get all handoffs to delete their files
    const handoffs = await this.repo.findByFeatureId(featureId);
    for (const handoff of handoffs) {
      if (handoff.filePath && (await this.fs.exists(handoff.filePath))) {
        await this.fs.remove(handoff.filePath);
      }
    }

    return this.repo.deleteByFeature(featureId);
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get statistics for a feature's handoffs
   *
   * @param featureId - Feature ID
   * @returns Statistics object
   */
  async getFeatureStats(featureId: string): Promise<{
    total: number;
    read: number;
    unread: number;
    byType: Record<HandoffType, number>;
  }> {
    return this.repo.getFeatureStats(featureId);
  }

  /**
   * Count unread handoffs for an agent
   *
   * @param agentId - Agent ID
   * @returns Number of unread handoffs
   */
  async countUnread(agentId: string): Promise<number> {
    return this.repo.countUnread(agentId);
  }

  // ==========================================================================
  // Git State Capture
  // ==========================================================================

  /**
   * Capture the current git state
   *
   * @param worktreePath - Path to the worktree
   * @returns Git state object
   */
  async captureGitState(worktreePath: string): Promise<GitState> {
    const [branch, commit, status] = await Promise.all([
      this.git.getCurrentBranch(worktreePath),
      this.git.getCurrentCommit(worktreePath),
      this.git.getStatus(worktreePath),
    ]);

    // Get commit message
    let commitMessage: string | undefined;
    try {
      const commitInfo = await this.git.getCommit(commit, worktreePath);
      commitMessage = commitInfo.message;
    } catch {
      // Ignore if we can't get commit message
    }

    return {
      branch,
      commit,
      shortCommit: commit.substring(0, 7),
      commitMessage,
      ahead: status.ahead,
      behind: status.behind,
      isDirty: status.hasStaged || status.hasUnstaged || status.hasUntracked,
      stagedFiles: status.files.filter(
        (f) => f.indexStatus !== " " && f.indexStatus !== "?"
      ).length,
      modifiedFiles: status.files.filter(
        (f) => f.worktreeStatus !== " " && f.worktreeStatus !== "?"
      ).length,
    };
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /**
   * Check if a handoff file exists
   *
   * @param worktreePath - Path to the worktree
   * @param stageId - Optional stage ID
   * @returns True if handoff file exists
   */
  async fileExists(worktreePath: string, stageId?: string): Promise<boolean> {
    const filePath = stageId
      ? getStageHandoffPath(worktreePath, stageId)
      : getHandoffYamlPath(worktreePath);
    return this.fs.exists(filePath);
  }

  /**
   * List all handoff files in a worktree
   *
   * @param worktreePath - Path to the worktree
   * @returns Array of handoff file paths
   */
  async listHandoffFiles(worktreePath: string): Promise<string[]> {
    const handoffDir = getHandoffDirPath(worktreePath);
    if (!(await this.fs.exists(handoffDir))) {
      return [];
    }

    const files = await this.fs.readDir(handoffDir, {
      extensions: [".yaml", ".yml"],
    });

    return files.map((f) => f.path);
  }

  /**
   * Watch for handoff file changes
   *
   * @param worktreePath - Path to the worktree
   * @param callback - Callback when handoff files change
   * @returns AbortController to stop watching
   */
  async watchHandoffFiles(
    worktreePath: string,
    callback: (filePath: string) => void
  ): Promise<AbortController> {
    const handoffDir = getHandoffDirPath(worktreePath);

    // Ensure directory exists
    await this.fs.ensureDir(handoffDir);

    return this.fs.watchPath(
      handoffDir,
      (event) => {
        if (
          event.filename?.endsWith(".yaml") ||
          event.filename?.endsWith(".yml")
        ) {
          callback(event.path);
        }
      },
      { recursive: true, debounceMs: 100 }
    );
  }
}

/**
 * Create a HandoffService instance
 *
 * @param deps - Service dependencies
 * @returns HandoffService instance
 */
export function createHandoffService(deps: HandoffServiceDeps): HandoffService {
  return new HandoffService(deps);
}
