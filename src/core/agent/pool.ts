/**
 * Process Pool Manager
 *
 * A semaphore-based process pool that manages concurrent agent limits and queuing.
 * This module provides controlled concurrency for spawning Claude CLI agents,
 * ensuring the system doesn't overwhelm resources by running too many agents
 * simultaneously.
 *
 * Features:
 * - Configurable maximum concurrent processes
 * - FIFO or priority-based queue strategies
 * - Async slot acquisition with blocking when pool is full
 * - Dynamic limit adjustment
 * - Pool statistics and monitoring
 *
 * @module core/agent/pool
 *
 * @example
 * ```typescript
 * const pool = new ProcessPool({ maxConcurrent: 3 });
 *
 * // Acquire a slot before spawning
 * await pool.acquire();
 * try {
 *   const proc = Bun.spawn(['claude', ...args]);
 *   await proc.exited;
 * } finally {
 *   pool.release();
 * }
 * ```
 */

import type { ProcessPoolConfig, QueueStrategy } from "./types.js";
import { DEFAULT_PROCESS_POOL_CONFIG } from "./types.js";

// ============================================================================
// Pool Statistics Interface
// ============================================================================

/**
 * Statistics about the current state of the process pool.
 *
 * Provides a snapshot of pool utilization for monitoring,
 * debugging, and UI display purposes.
 */
export interface PoolStats {
  /** Maximum number of concurrent processes allowed */
  maxConcurrent: number;
  /** Number of processes currently running */
  running: number;
  /** Number of requests waiting in the queue */
  queued: number;
  /** Number of slots currently available (maxConcurrent - running) */
  available: number;
  /** Percentage of pool capacity currently in use (0-100) */
  utilizationPercent: number;
}

// ============================================================================
// Queued Item Interface
// ============================================================================

/**
 * Internal representation of a queued acquire request.
 * @internal
 */
interface QueuedItem {
  /** Resolve function to call when a slot becomes available */
  resolve: () => void;
  /** Reject function to call if the request is cancelled */
  reject: (error: Error) => void;
  /** Priority level (higher = more urgent, used in priority strategy) */
  priority: number;
  /** When this item was enqueued (for debugging/metrics) */
  enqueuedAt: Date;
}

// ============================================================================
// ProcessPool Class
// ============================================================================

/**
 * A semaphore-based pool that manages concurrent agent process limits.
 *
 * The ProcessPool acts as a gatekeeper for spawning new agent processes.
 * Before spawning an agent, callers must acquire a slot from the pool.
 * If all slots are in use, the acquire call will block (return a Promise
 * that resolves when a slot becomes available).
 *
 * The pool supports two queue strategies:
 * - `fifo`: First-in, first-out ordering (default)
 * - `priority`: Higher priority items are processed first
 *
 * @example
 * ```typescript
 * // Create a pool with custom config
 * const pool = new ProcessPool({
 *   maxConcurrent: 5,
 *   queueStrategy: 'priority'
 * });
 *
 * // High-priority agent
 * await pool.acquire(10);
 * try {
 *   // spawn and run agent
 * } finally {
 *   pool.release();
 * }
 * ```
 */
export class ProcessPool {
  /** Maximum number of concurrent processes allowed */
  private maxConcurrent: number;

  /** Queue ordering strategy */
  private queueStrategy: QueueStrategy;

  /** Number of slots currently in use */
  private running: number;

  /** Queue of pending acquire requests */
  private queue: QueuedItem[];

  /**
   * Creates a new ProcessPool instance.
   *
   * @param config - Optional configuration options. Uses DEFAULT_PROCESS_POOL_CONFIG for missing values.
   *
   * @example
   * ```typescript
   * // Use all defaults (max 5 concurrent, fifo strategy)
   * const pool1 = new ProcessPool();
   *
   * // Custom max concurrent
   * const pool2 = new ProcessPool({ maxConcurrent: 10 });
   *
   * // Custom strategy
   * const pool3 = new ProcessPool({
   *   maxConcurrent: 3,
   *   queueStrategy: 'priority'
   * });
   * ```
   */
  constructor(config?: Partial<ProcessPoolConfig>) {
    this.maxConcurrent =
      config?.maxConcurrent ?? DEFAULT_PROCESS_POOL_CONFIG.maxConcurrent;
    this.queueStrategy =
      config?.queueStrategy ?? DEFAULT_PROCESS_POOL_CONFIG.queueStrategy;
    this.running = 0;
    this.queue = [];
  }

  /**
   * Acquire a slot from the pool.
   *
   * If a slot is available, returns immediately. If all slots are in use,
   * the returned Promise will block until a slot becomes available.
   *
   * For the `priority` queue strategy, higher priority values are processed first.
   * For the `fifo` strategy, priority is ignored and items are processed in order.
   *
   * @param priority - Priority level for queue ordering (default: 0).
   *                   Only used when queueStrategy is 'priority'.
   *                   Higher values indicate higher priority.
   * @returns Promise that resolves when a slot is acquired.
   *
   * @example
   * ```typescript
   * // Simple acquire (blocks if pool is full)
   * await pool.acquire();
   *
   * // High-priority acquire
   * await pool.acquire(100);
   *
   * // Low-priority acquire
   * await pool.acquire(-10);
   * ```
   */
  async acquire(priority: number = 0): Promise<void> {
    // If a slot is available, take it immediately
    if (this.running < this.maxConcurrent) {
      this.running++;
      return;
    }

    // Otherwise, queue the request and wait
    return new Promise<void>((resolve, reject) => {
      const item: QueuedItem = {
        resolve,
        reject,
        priority,
        enqueuedAt: new Date(),
      };

      if (this.queueStrategy === "priority") {
        // Insert in sorted position (higher priority first)
        const insertIndex = this.findInsertIndex(priority);
        this.queue.splice(insertIndex, 0, item);
      } else {
        // FIFO: append to end
        this.queue.push(item);
      }
    });
  }

  /**
   * Find the insertion index for a priority item.
   * Maintains descending order by priority.
   * @internal
   */
  private findInsertIndex(priority: number): number {
    // Binary search for correct position
    let low = 0;
    let high = this.queue.length;

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      // Higher priority should come first
      if (this.queue[mid].priority >= priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }

    return low;
  }

  /**
   * Release a slot back to the pool.
   *
   * Call this when an agent process completes (either successfully or with an error).
   * If there are pending requests in the queue, the first one will be activated.
   *
   * **Important**: Always call release() in a finally block to ensure slots are
   * properly returned even if the agent process fails.
   *
   * @example
   * ```typescript
   * await pool.acquire();
   * try {
   *   const proc = Bun.spawn(['claude', ...args]);
   *   await proc.exited;
   * } finally {
   *   pool.release(); // Always release!
   * }
   * ```
   */
  release(): void {
    // Guard against over-releasing
    if (this.running <= 0) {
      console.warn(
        "ProcessPool: release() called when no slots are in use. Ignoring."
      );
      return;
    }

    // If there are queued items, activate the next one
    if (this.queue.length > 0) {
      // Take the first item (already sorted by priority or FIFO order)
      const next = this.queue.shift()!;
      // Resolve its promise to let it proceed
      // Note: running count stays the same since we're transferring the slot
      next.resolve();
    } else {
      // No queued items, just decrement the running count
      this.running--;
    }
  }

  /**
   * Get the number of available slots.
   *
   * Returns how many more processes can be started without blocking.
   *
   * @returns Number of available slots (0 if pool is full).
   *
   * @example
   * ```typescript
   * if (pool.getAvailable() > 0) {
   *   // Can start without waiting
   *   await pool.acquire();
   * } else {
   *   console.log('Pool is full, will need to wait');
   *   await pool.acquire();
   * }
   * ```
   */
  getAvailable(): number {
    return Math.max(0, this.maxConcurrent - this.running);
  }

  /**
   * Get the number of items waiting in the queue.
   *
   * @returns Number of pending acquire requests.
   *
   * @example
   * ```typescript
   * const queued = pool.getQueued();
   * if (queued > 10) {
   *   console.warn('High queue backlog:', queued);
   * }
   * ```
   */
  getQueued(): number {
    return this.queue.length;
  }

  /**
   * Get the number of currently running processes.
   *
   * @returns Number of slots currently in use.
   *
   * @example
   * ```typescript
   * console.log(`Running: ${pool.getRunning()}/${pool.maxConcurrent}`);
   * ```
   */
  getRunning(): number {
    return this.running;
  }

  /**
   * Change the concurrent limit dynamically.
   *
   * If the new limit is higher than the current limit and there are
   * queued items, some will be released to fill the new capacity.
   *
   * If the new limit is lower than the current running count, no
   * running processes are terminated - the reduction takes effect
   * as processes complete naturally.
   *
   * @param max - New maximum concurrent processes. Must be >= 1.
   * @throws Error if max is less than 1.
   *
   * @example
   * ```typescript
   * // Scale up during peak hours
   * pool.setLimit(10);
   *
   * // Scale down for maintenance
   * pool.setLimit(2);
   * ```
   */
  setLimit(max: number): void {
    if (max < 1) {
      throw new Error("ProcessPool: maxConcurrent must be at least 1");
    }

    const oldLimit = this.maxConcurrent;
    this.maxConcurrent = max;

    // If we increased the limit and have queued items, release some
    if (max > oldLimit) {
      const newSlots = max - oldLimit;
      const toRelease = Math.min(newSlots, this.queue.length);

      for (let i = 0; i < toRelease; i++) {
        const next = this.queue.shift()!;
        this.running++;
        next.resolve();
      }
    }
  }

  /**
   * Get comprehensive pool statistics.
   *
   * Returns a snapshot of the current pool state including
   * capacity, usage, and utilization metrics.
   *
   * @returns Current pool statistics.
   *
   * @example
   * ```typescript
   * const stats = pool.getStats();
   * console.log(`Pool utilization: ${stats.utilizationPercent}%`);
   * console.log(`${stats.running}/${stats.maxConcurrent} slots in use`);
   * console.log(`${stats.queued} waiting in queue`);
   * ```
   */
  getStats(): PoolStats {
    const available = this.getAvailable();
    const utilizationPercent =
      this.maxConcurrent > 0
        ? Math.round((this.running / this.maxConcurrent) * 100)
        : 0;

    return {
      maxConcurrent: this.maxConcurrent,
      running: this.running,
      queued: this.queue.length,
      available,
      utilizationPercent,
    };
  }

  /**
   * Clear the queue, rejecting all waiting requests.
   *
   * Use this for cleanup during shutdown or when canceling
   * a batch of pending operations. All queued acquire()
   * calls will reject with an error.
   *
   * **Note**: This does not affect currently running processes.
   * Call release() for each running process as they complete.
   *
   * @example
   * ```typescript
   * // During shutdown
   * pool.clearQueue();
   *
   * // In calling code, handle the rejection:
   * try {
   *   await pool.acquire();
   * } catch (error) {
   *   if (error.message.includes('Queue cleared')) {
   *     // Pool was shut down, cleanup
   *   }
   * }
   * ```
   */
  clearQueue(): void {
    const error = new Error("ProcessPool: Queue cleared");

    // Reject all pending items
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      item.reject(error);
    }
  }

  /**
   * Check if a slot is immediately available.
   *
   * Convenience method to check availability without blocking.
   *
   * @returns True if acquire() would return immediately.
   *
   * @example
   * ```typescript
   * if (pool.hasAvailableSlot()) {
   *   // Start immediately
   * } else {
   *   // Show "waiting" UI
   * }
   * ```
   */
  hasAvailableSlot(): boolean {
    return this.running < this.maxConcurrent;
  }

  /**
   * Get the current queue strategy.
   *
   * @returns The queue strategy ('fifo' or 'priority').
   */
  getQueueStrategy(): QueueStrategy {
    return this.queueStrategy;
  }

  /**
   * Get the current maximum concurrent limit.
   *
   * @returns The maximum number of concurrent processes.
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ProcessPool instance with optional configuration.
 *
 * Factory function for creating process pools. Uses default configuration
 * values for any options not specified.
 *
 * @param config - Optional partial configuration.
 * @returns A new ProcessPool instance.
 *
 * @example
 * ```typescript
 * // With defaults
 * const pool1 = createProcessPool();
 *
 * // With custom config
 * const pool2 = createProcessPool({
 *   maxConcurrent: 10,
 *   queueStrategy: 'priority'
 * });
 * ```
 */
export function createProcessPool(
  config?: Partial<ProcessPoolConfig>
): ProcessPool {
  return new ProcessPool(config);
}

// ============================================================================
// Re-exports
// ============================================================================

export type { ProcessPoolConfig, QueueStrategy } from "./types.js";
export { DEFAULT_PROCESS_POOL_CONFIG } from "./types.js";
