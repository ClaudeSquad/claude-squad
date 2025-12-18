/**
 * Event Bus Tests
 *
 * Tests for the RxJS-based event bus system.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { EventBus, eventBus, createEventBus } from "../../../src/infra/events/event-bus.js";
import { createEvent } from "../../../src/infra/events/types.js";
import type { AgentStartedEvent, AgentOutputEvent } from "../../../src/infra/events/types.js";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = createEventBus();
  });

  describe("emit and subscribe", () => {
    it("should emit events to subscribers", (done) => {
      const event: AgentStartedEvent = {
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        worktreePath: "/test/path",
        timestamp: Date.now(),
      };

      bus.on("AGENT_STARTED").subscribe((received) => {
        expect(received.type).toBe("AGENT_STARTED");
        expect(received.agentId).toBe("agt_123");
        expect(received.pid).toBe(12345);
        done();
      });

      bus.emit(event);
    });

    it("should only emit to matching event type subscribers", () => {
      const events: string[] = [];

      // Subscribe to AGENT_STARTED
      bus.on("AGENT_STARTED").subscribe(() => {
        events.push("AGENT_STARTED");
      });

      // Subscribe to AGENT_OUTPUT
      bus.on("AGENT_OUTPUT").subscribe(() => {
        events.push("AGENT_OUTPUT");
      });

      // Emit AGENT_STARTED
      const startEvent: AgentStartedEvent = {
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      };

      bus.emit(startEvent);

      expect(events).toEqual(["AGENT_STARTED"]);
    });

    it("should emit to multiple subscribers of the same event type", () => {
      let count = 0;

      bus.on("AGENT_STARTED").subscribe(() => count++);
      bus.on("AGENT_STARTED").subscribe(() => count++);
      bus.on("AGENT_STARTED").subscribe(() => count++);

      const event: AgentStartedEvent = {
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      };

      bus.emit(event);

      expect(count).toBe(3);
    });
  });

  describe("all() stream", () => {
    it("should receive all events regardless of type", () => {
      const events: string[] = [];

      bus.all().subscribe((event) => {
        events.push(event.type);
      });

      const startEvent: AgentStartedEvent = {
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      };

      const outputEvent: AgentOutputEvent = {
        type: "AGENT_OUTPUT",
        agentId: "agt_123",
        message: "Hello",
        stream: "stdout",
        timestamp: Date.now(),
      };

      bus.emit(startEvent);
      bus.emit(outputEvent);

      expect(events).toEqual(["AGENT_STARTED", "AGENT_OUTPUT"]);
    });
  });

  describe("onAny", () => {
    it("should subscribe to multiple event types", () => {
      const events: string[] = [];

      bus.onAny(["AGENT_STARTED", "AGENT_COMPLETED"]).subscribe((event) => {
        events.push(event.type);
      });

      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      });

      bus.emit({
        type: "AGENT_OUTPUT",
        agentId: "agt_123",
        message: "test",
        stream: "stdout",
        timestamp: Date.now(),
      });

      bus.emit({
        type: "AGENT_COMPLETED",
        agentId: "agt_123",
        exitCode: 0,
        duration: 1000,
        timestamp: Date.now(),
      });

      expect(events).toEqual(["AGENT_STARTED", "AGENT_COMPLETED"]);
    });
  });

  describe("named subscriptions", () => {
    it("should allow subscribing with name", () => {
      let received = false;

      bus.subscribe("test-sub", "AGENT_STARTED", () => {
        received = true;
      });

      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      });

      expect(received).toBe(true);
    });

    it("should unsubscribe by name", () => {
      let count = 0;

      bus.subscribe("test-sub", "AGENT_STARTED", () => {
        count++;
      });

      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      });

      expect(count).toBe(1);

      bus.unsubscribe("test-sub");

      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      });

      expect(count).toBe(1); // Should still be 1
    });

    it("should track subscription count", () => {
      bus.subscribe("sub1", "AGENT_STARTED", () => {});
      bus.subscribe("sub2", "AGENT_OUTPUT", () => {});

      expect(bus.subscriptionCount).toBe(2);

      bus.unsubscribe("sub1");

      expect(bus.subscriptionCount).toBe(1);
    });
  });

  describe("event history", () => {
    it("should store events in history", () => {
      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      });

      bus.emit({
        type: "AGENT_OUTPUT",
        agentId: "agt_123",
        message: "test",
        stream: "stdout",
        timestamp: Date.now(),
      });

      expect(bus.historySize).toBe(2);
    });

    it("should get recent events", () => {
      for (let i = 0; i < 5; i++) {
        bus.emit({
          type: "AGENT_OUTPUT",
          agentId: `agt_${i}`,
          message: `Message ${i}`,
          stream: "stdout",
          timestamp: Date.now(),
        });
      }

      const recent = bus.getRecentEvents(3);
      expect(recent.length).toBe(3);
    });

    it("should filter recent events by type", () => {
      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_1",
        pid: 1,
        timestamp: Date.now(),
      });

      bus.emit({
        type: "AGENT_OUTPUT",
        agentId: "agt_1",
        message: "test",
        stream: "stdout",
        timestamp: Date.now(),
      });

      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_2",
        pid: 2,
        timestamp: Date.now(),
      });

      const startEvents = bus.getRecentEvents(10, "AGENT_STARTED");
      expect(startEvents.length).toBe(2);
    });
  });

  describe("complete", () => {
    it("should complete all subscriptions", (done) => {
      let completed = false;

      bus.on("AGENT_STARTED").subscribe({
        complete: () => {
          completed = true;
          done();
        },
      });

      bus.complete();

      expect(completed).toBe(true);
    });

    it("should not emit events after completion", () => {
      let received = false;

      bus.on("AGENT_STARTED").subscribe(() => {
        received = true;
      });

      bus.complete();

      bus.emit({
        type: "AGENT_STARTED",
        agentId: "agt_123",
        pid: 12345,
        timestamp: Date.now(),
      });

      expect(received).toBe(false);
    });
  });

  describe("createEvent helper", () => {
    it("should create events with timestamp", () => {
      const event = createEvent({
        type: "SESSION_CREATED",
        sessionId: "ses_123",
        projectPath: "/test/project",
      });

      expect(event.type).toBe("SESSION_CREATED");
      expect(event.sessionId).toBe("ses_123");
      expect(typeof event.timestamp).toBe("number");
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });

  describe("global eventBus singleton", () => {
    it("should be an EventBus instance", () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });
  });

  describe("createEventBus factory", () => {
    it("should create isolated instances", () => {
      const bus1 = createEventBus();
      const bus2 = createEventBus();

      expect(bus1).not.toBe(bus2);
    });

    it("should respect maxHistorySize option", () => {
      const smallBus = createEventBus({ maxHistorySize: 2 });

      smallBus.emit({
        type: "AGENT_OUTPUT",
        agentId: "1",
        message: "1",
        stream: "stdout",
        timestamp: Date.now(),
      });

      smallBus.emit({
        type: "AGENT_OUTPUT",
        agentId: "2",
        message: "2",
        stream: "stdout",
        timestamp: Date.now(),
      });

      smallBus.emit({
        type: "AGENT_OUTPUT",
        agentId: "3",
        message: "3",
        stream: "stdout",
        timestamp: Date.now(),
      });

      expect(smallBus.historySize).toBe(2);
    });
  });
});
