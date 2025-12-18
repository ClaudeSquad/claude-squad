/**
 * Event Bus
 *
 * Central event bus using RxJS for reactive communication between components.
 * Supports type-safe event filtering and multicasting.
 */

import { Subject, Observable, Subscription } from "rxjs";
import { filter } from "rxjs/operators";
import type { DomainEvent, DomainEventType, EventOfType } from "./types.js";

/**
 * Event handler function type
 */
export type EventHandler<T extends DomainEvent> = (event: T) => void;

/**
 * Event Bus
 *
 * Provides a centralized pub/sub system for domain events using RxJS.
 * Components can emit events and subscribe to specific event types
 * with full TypeScript type safety.
 *
 * @example
 * ```typescript
 * // Subscribe to agent output events
 * eventBus.on('AGENT_OUTPUT').subscribe(event => {
 *   console.log(`Agent ${event.agentId}: ${event.message}`);
 * });
 *
 * // Emit an event
 * eventBus.emit({
 *   type: 'AGENT_OUTPUT',
 *   agentId: 'agt_123',
 *   message: 'Processing...',
 *   stream: 'stdout',
 *   timestamp: Date.now()
 * });
 * ```
 */
export class EventBus {
  private subject = new Subject<DomainEvent>();
  private subscriptions = new Map<string, Subscription>();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize: number;

  constructor(options: { maxHistorySize?: number } = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 1000;
  }

  /**
   * Emit a domain event to all subscribers
   *
   * @param event - The domain event to emit
   *
   * @example
   * ```typescript
   * eventBus.emit({
   *   type: 'AGENT_STARTED',
   *   agentId: 'agt_123',
   *   pid: 12345,
   *   timestamp: Date.now()
   * });
   * ```
   */
  emit(event: DomainEvent): void {
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Broadcast to subscribers
    this.subject.next(event);
  }

  /**
   * Subscribe to events of a specific type
   *
   * @param eventType - The event type to subscribe to
   * @returns Observable of events matching the specified type
   *
   * @example
   * ```typescript
   * eventBus.on('AGENT_COMPLETED').subscribe(event => {
   *   console.log(`Agent ${event.agentId} finished with code ${event.exitCode}`);
   * });
   * ```
   */
  on<T extends DomainEventType>(eventType: T): Observable<EventOfType<T>> {
    return this.subject.pipe(
      filter((e): e is EventOfType<T> => e.type === eventType)
    );
  }

  /**
   * Subscribe to multiple event types
   *
   * @param eventTypes - Array of event types to subscribe to
   * @returns Observable of events matching any of the specified types
   *
   * @example
   * ```typescript
   * eventBus.onAny(['AGENT_STARTED', 'AGENT_COMPLETED']).subscribe(event => {
   *   console.log(`Agent lifecycle event: ${event.type}`);
   * });
   * ```
   */
  onAny<T extends DomainEventType>(eventTypes: T[]): Observable<EventOfType<T>> {
    const typeSet = new Set<string>(eventTypes);
    return this.subject.pipe(
      filter((e): e is EventOfType<T> => typeSet.has(e.type))
    );
  }

  /**
   * Subscribe to all events
   *
   * @returns Observable of all domain events
   *
   * @example
   * ```typescript
   * eventBus.all().subscribe(event => {
   *   logger.debug(`Event: ${event.type}`, event);
   * });
   * ```
   */
  all(): Observable<DomainEvent> {
    return this.subject.asObservable();
  }

  /**
   * Subscribe with a named subscription for later cleanup
   *
   * @param name - Unique name for this subscription
   * @param eventType - Event type to subscribe to
   * @param handler - Handler function to call when event is received
   *
   * @example
   * ```typescript
   * eventBus.subscribe('agent-monitor', 'AGENT_OUTPUT', event => {
   *   updateUI(event.message);
   * });
   *
   * // Later, unsubscribe
   * eventBus.unsubscribe('agent-monitor');
   * ```
   */
  subscribe<T extends DomainEventType>(
    name: string,
    eventType: T,
    handler: EventHandler<EventOfType<T>>
  ): void {
    // Clean up existing subscription with same name
    this.unsubscribe(name);

    const subscription = this.on(eventType).subscribe(handler);
    this.subscriptions.set(name, subscription);
  }

  /**
   * Unsubscribe a named subscription
   *
   * @param name - Name of the subscription to remove
   * @returns True if a subscription was found and removed
   */
  unsubscribe(name: string): boolean {
    const subscription = this.subscriptions.get(name);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Get recent events from history
   *
   * @param count - Number of recent events to return
   * @param eventType - Optional filter by event type
   * @returns Array of recent events
   */
  getRecentEvents<T extends DomainEventType>(
    count: number,
    eventType?: T
  ): (T extends undefined ? DomainEvent : EventOfType<T>)[] {
    let events = this.eventHistory;

    if (eventType) {
      events = events.filter((e) => e.type === eventType);
    }

    return events.slice(-count) as (T extends undefined ? DomainEvent : EventOfType<T>)[];
  }

  /**
   * Get events within a time range
   *
   * @param startTime - Start timestamp (inclusive)
   * @param endTime - End timestamp (inclusive)
   * @returns Array of events within the time range
   */
  getEventsInRange(startTime: number, endTime: number): DomainEvent[] {
    return this.eventHistory.filter(
      (e) => e.timestamp >= startTime && e.timestamp <= endTime
    );
  }

  /**
   * Clear all subscriptions and history
   */
  clear(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();
    this.eventHistory = [];
  }

  /**
   * Complete the event bus (no more events can be emitted)
   */
  complete(): void {
    this.clear();
    this.subject.complete();
  }

  /**
   * Get the number of events in history
   */
  get historySize(): number {
    return this.eventHistory.length;
  }

  /**
   * Get the number of active subscriptions
   */
  get subscriptionCount(): number {
    return this.subscriptions.size;
  }
}

/**
 * Global event bus instance
 *
 * Use this singleton for application-wide event communication.
 */
export const eventBus = new EventBus();

/**
 * Create a new isolated event bus instance
 *
 * Useful for testing or isolated subsystems.
 */
export function createEventBus(options?: { maxHistorySize?: number }): EventBus {
  return new EventBus(options);
}
