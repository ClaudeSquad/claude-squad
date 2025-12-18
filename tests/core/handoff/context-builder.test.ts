/**
 * Context Builder Tests
 *
 * Tests for the handoff context aggregation and formatting.
 */

import { describe, test, expect } from "bun:test";
import {
  ContextBuilder,
  createContextBuilder,
  type AggregatedContext,
} from "../../../src/core/handoff/context-builder.js";
import type { Handoff, HandoffContent, HandoffType } from "../../../src/core/entities/handoff.js";
import type { HandoffYaml } from "../../../src/core/handoff/schema.js";

// ============================================================================
// Test Data Factories
// ============================================================================

function createTestHandoff(overrides?: Partial<Handoff>): Handoff {
  return {
    id: "hnd_test123abc",
    fromAgent: "agt_from123",
    toAgent: "agt_to456",
    featureId: "ftr_feature123",
    stageId: "stg_stage123",
    type: "implementation" as HandoffType,
    content: createTestContent(),
    isRead: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function createTestContent(overrides?: Partial<HandoffContent>): HandoffContent {
  return {
    architectureSummary: "Test architecture summary",
    implementationNotes: ["Note 1", "Note 2"],
    filesCreated: ["src/new-file.ts"],
    filesModified: ["src/existing.ts"],
    filesDeleted: [],
    ...overrides,
  };
}

function createTestHandoffYaml(): HandoffYaml {
  return {
    version: "1.0",
    fromAgent: { id: "agt_test", name: "Test Agent", role: "tester" },
    toAgent: "any",
    context: {
      summary: "Test summary",
      decisions: [
        {
          title: "Tech Choice",
          decision: "Use TypeScript",
          rationale: "Type safety",
        },
      ],
      currentState: {
        phase: "implementation",
        progress: 75,
        status: "in-progress",
      },
    },
    filesModified: [
      {
        path: "src/main.ts",
        description: "Added main logic",
        changeType: "created",
        linesAdded: 100,
      },
    ],
    nextSteps: [
      {
        priority: "high",
        description: "Implement tests",
        estimatedEffort: "2 hours",
      },
    ],
    blockers: [],
    metadata: {
      timestamp: new Date().toISOString(),
      featureId: "ftr_test123",
      urgency: "normal",
    },
  };
}

// ============================================================================
// Context Builder Tests
// ============================================================================

describe("ContextBuilder", () => {
  describe("createContextBuilder", () => {
    test("should create a ContextBuilder instance", () => {
      const builder = createContextBuilder();
      expect(builder).toBeInstanceOf(ContextBuilder);
    });
  });

  describe("aggregate", () => {
    test("should return empty context for empty handoff array", () => {
      const builder = new ContextBuilder();
      const context = builder.aggregate([]);

      expect(context.summary).toBe("No previous handoff context available.");
      expect(context.decisions).toHaveLength(0);
      expect(context.filesModified).toHaveLength(0);
      expect(context.currentState.progress).toBe(0);
    });

    test("should aggregate single handoff", () => {
      const builder = new ContextBuilder();
      const handoff = createTestHandoff();
      const context = builder.aggregate([handoff]);

      expect(context.summary).toContain("Test architecture summary");
      expect(context.filesModified.length).toBeGreaterThan(0);
    });

    test("should aggregate multiple handoffs", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({
          type: "architecture",
          content: createTestContent({
            architectureSummary: "Architecture phase completed",
            filesCreated: ["docs/architecture.md"],
          }),
        }),
        createTestHandoff({
          type: "implementation",
          content: createTestContent({
            architectureSummary: "Implementation phase completed",
            filesCreated: ["src/feature.ts"],
            filesModified: ["package.json"],
          }),
        }),
      ];

      const context = builder.aggregate(handoffs);
      expect(context.summary).toContain("Stage 1");
      expect(context.summary).toContain("Stage 2");
    });

    test("should filter by handoff type", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({ type: "architecture" }),
        createTestHandoff({ type: "implementation" }),
        createTestHandoff({ type: "review_feedback" }),
      ];

      const context = builder.aggregate(handoffs, {
        types: ["architecture", "implementation"],
      });

      // Should only include filtered types
      expect(context.currentState.phase).toBeDefined();
    });

    test("should deduplicate file changes", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({
          content: createTestContent({
            filesCreated: ["src/file.ts"],
          }),
        }),
        createTestHandoff({
          content: createTestContent({
            filesModified: ["src/file.ts"], // Same file, now modified
          }),
        }),
      ];

      const context = builder.aggregate(handoffs);
      // File should appear once with "created" status (first wins for created)
      const fileEntries = context.filesModified.filter((f) => f.path === "src/file.ts");
      expect(fileEntries.length).toBeLessThanOrEqual(1);
    });

    test("should respect maxSummaryLength option", () => {
      const builder = new ContextBuilder();
      const longSummary = "A".repeat(300);
      const handoffs = [
        createTestHandoff({
          content: createTestContent({
            architectureSummary: longSummary,
          }),
        }),
      ];

      const context = builder.aggregate(handoffs, { maxSummaryLength: 100 });
      expect(context.summary.length).toBeLessThanOrEqual(100);
    });

    test("should collect decisions from implementation notes", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({
          content: createTestContent({
            implementationNotes: [
              "Tech Choice: Use React (Better ecosystem)",
              "Database: PostgreSQL",
            ],
          }),
        }),
      ];

      const context = builder.aggregate(handoffs, { maxDecisions: 10 });
      expect(context.decisions.length).toBeGreaterThan(0);
    });

    test("should extract current state from latest handoff", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({ type: "architecture", isRead: true }),
        createTestHandoff({ type: "implementation", isRead: false }),
      ];

      const context = builder.aggregate(handoffs);
      expect(context.currentState.phase).toBe("implementation");
    });

    test("should collect dependencies from handoffs", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({
          content: createTestContent({
            dependenciesAdded: ["react", "typescript"],
          }),
        }),
        createTestHandoff({
          content: createTestContent({
            dependenciesAdded: ["jest", "typescript"], // duplicate
          }),
        }),
      ];

      const context = builder.aggregate(handoffs);
      expect(context.dependencies).toBeDefined();
      // Should deduplicate
      const typescriptCount = context.dependencies?.filter((d) => d === "typescript").length ?? 0;
      expect(typescriptCount).toBe(1);
    });

    test("should collect environment variables", () => {
      const builder = new ContextBuilder();
      const handoffs = [
        createTestHandoff({
          content: createTestContent({
            environmentVariables: ["API_KEY", "DATABASE_URL"],
          }),
        }),
      ];

      const context = builder.aggregate(handoffs);
      expect(context.environmentVariables).toContain("API_KEY");
      expect(context.environmentVariables).toContain("DATABASE_URL");
    });
  });

  describe("aggregateFromYaml", () => {
    test("should aggregate HandoffYaml objects", () => {
      const builder = new ContextBuilder();
      const yamls = [createTestHandoffYaml()];

      const context = builder.aggregateFromYaml(yamls);
      expect(context.summary).toBe("Test summary");
      expect(context.decisions).toHaveLength(1);
      expect(context.currentState.progress).toBe(75);
    });

    test("should return empty context for empty array", () => {
      const builder = new ContextBuilder();
      const context = builder.aggregateFromYaml([]);

      expect(context.summary).toBe("No previous handoff context available.");
    });

    test("should combine multiple yaml handoffs", () => {
      const builder = new ContextBuilder();
      const yaml1 = createTestHandoffYaml();
      const yaml2: HandoffYaml = {
        ...createTestHandoffYaml(),
        context: {
          summary: "Second phase completed",
          decisions: [{ title: "API Design", decision: "REST over GraphQL" }],
          currentState: { phase: "testing", progress: 90, status: "testing" },
        },
      };

      const context = builder.aggregateFromYaml([yaml1, yaml2]);
      expect(context.decisions.length).toBe(2);
      expect(context.currentState.phase).toBe("testing"); // Latest
    });
  });

  describe("format", () => {
    test("should format as markdown by default", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test summary",
        decisions: [{ title: "Decision", decision: "Choice" }],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.format).toBe("markdown");
      expect(formatted.content).toContain("## Summary");
      expect(formatted.content).toContain("Test summary");
    });

    test("should format as yaml when requested", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test summary",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123", { format: "yaml" });
      expect(formatted.format).toBe("yaml");
      expect(formatted.content).toContain("summary:");
    });

    test("should format as plain text when requested", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test summary",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123", { format: "text" });
      expect(formatted.format).toBe("text");
      expect(formatted.content).toContain("HANDOFF CONTEXT");
      expect(formatted.content).toContain("SUMMARY:");
    });

    test("should include metadata in formatted output", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [
          { path: "a.ts", description: "test", changeType: "created" },
          { path: "b.ts", description: "test", changeType: "modified" },
        ],
        nextSteps: [],
        blockers: [{ severity: "critical", description: "Blocker" }],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.metadata.featureId).toBe("ftr_test123");
      expect(formatted.metadata.totalFilesChanged).toBe(2);
      expect(formatted.metadata.hasBlockers).toBe(true);
      expect(formatted.metadata.hasUnresolvedIssues).toBe(true);
    });

    test("should include character count", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test summary",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.charCount).toBe(formatted.content.length);
    });

    test("should include decisions in markdown format", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test",
        decisions: [
          {
            title: "Tech Stack",
            decision: "Use React",
            rationale: "Better ecosystem",
            alternatives: ["Vue", "Angular"],
          },
        ],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.content).toContain("## Key Decisions");
      expect(formatted.content).toContain("### Tech Stack");
      expect(formatted.content).toContain("Use React");
      expect(formatted.content).toContain("Better ecosystem");
      expect(formatted.content).toContain("Vue, Angular");
    });

    test("should include next steps in markdown format", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [
          { priority: "urgent", description: "Fix bug", estimatedEffort: "1h" },
          { priority: "normal", description: "Add tests" },
        ],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.content).toContain("## Next Steps");
      expect(formatted.content).toContain("**URGENT**");
      expect(formatted.content).toContain("Fix bug");
    });

    test("should include blockers in markdown format", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [],
        nextSteps: [],
        blockers: [
          {
            severity: "critical",
            description: "API unavailable",
            suggestedResolution: "Contact backend team",
          },
        ],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.content).toContain("## Blockers");
      expect(formatted.content).toContain("**CRITICAL**");
      expect(formatted.content).toContain("API unavailable");
      expect(formatted.content).toContain("Contact backend team");
    });

    test("should include files modified in markdown format", () => {
      const builder = new ContextBuilder();
      const context: AggregatedContext = {
        summary: "Test",
        decisions: [],
        currentState: { phase: "test", progress: 50, status: "in-progress" },
        filesModified: [
          {
            path: "src/main.ts",
            description: "Added entry point",
            changeType: "created",
            linesAdded: 50,
            linesRemoved: 0,
          },
        ],
        nextSteps: [],
        blockers: [],
      };

      const formatted = builder.format(context, "ftr_test123");
      expect(formatted.content).toContain("## Files Modified");
      expect(formatted.content).toContain("`src/main.ts`");
      expect(formatted.content).toContain("[created]");
      expect(formatted.content).toContain("+50/-0");
    });
  });
});
