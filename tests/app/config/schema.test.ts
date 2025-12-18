/**
 * Configuration Schema Tests
 *
 * Tests for Zod schema validation of configuration.
 */

import { describe, test, expect } from "bun:test";
import {
  SquadConfigSchema,
  ModelSchema,
  ReviewGateBehaviorSchema,
  DefaultsSchema,
  IntegrationsSchema,
  RepositorySchema,
  validateConfig,
  safeValidateConfig,
  formatValidationErrors,
  DEFAULT_CONFIG,
} from "../../../src/app/config/schema.js";

describe("ModelSchema", () => {
  test("should accept valid models", () => {
    expect(ModelSchema.parse("sonnet")).toBe("sonnet");
    expect(ModelSchema.parse("opus")).toBe("opus");
    expect(ModelSchema.parse("haiku")).toBe("haiku");
  });

  test("should reject invalid models", () => {
    expect(() => ModelSchema.parse("gpt-4")).toThrow();
    expect(() => ModelSchema.parse("")).toThrow();
    expect(() => ModelSchema.parse(123)).toThrow();
  });
});

describe("ReviewGateBehaviorSchema", () => {
  test("should accept valid behaviors", () => {
    expect(ReviewGateBehaviorSchema.parse("pause")).toBe("pause");
    expect(ReviewGateBehaviorSchema.parse("notify")).toBe("notify");
    expect(ReviewGateBehaviorSchema.parse("auto-approve")).toBe("auto-approve");
  });

  test("should reject invalid behaviors", () => {
    expect(() => ReviewGateBehaviorSchema.parse("skip")).toThrow();
    expect(() => ReviewGateBehaviorSchema.parse("")).toThrow();
  });
});

describe("DefaultsSchema", () => {
  test("should apply default values", () => {
    const result = DefaultsSchema.parse({});

    expect(result.workflow).toBe("feature");
    expect(result.model).toBe("sonnet");
    expect(result.maxConcurrentAgents).toBe(5);
    expect(result.reviewGateBehavior).toBe("pause");
  });

  test("should accept custom values", () => {
    const result = DefaultsSchema.parse({
      workflow: "bugfix",
      model: "opus",
      maxConcurrentAgents: 3,
      reviewGateBehavior: "notify",
    });

    expect(result.workflow).toBe("bugfix");
    expect(result.model).toBe("opus");
    expect(result.maxConcurrentAgents).toBe(3);
    expect(result.reviewGateBehavior).toBe("notify");
  });

  test("should validate maxConcurrentAgents range", () => {
    expect(() => DefaultsSchema.parse({ maxConcurrentAgents: 0 })).toThrow();
    expect(() => DefaultsSchema.parse({ maxConcurrentAgents: 11 })).toThrow();

    expect(DefaultsSchema.parse({ maxConcurrentAgents: 1 }).maxConcurrentAgents).toBe(1);
    expect(DefaultsSchema.parse({ maxConcurrentAgents: 10 }).maxConcurrentAgents).toBe(10);
  });
});

describe("IntegrationsSchema", () => {
  test("should apply default values", () => {
    const result = IntegrationsSchema.parse({});

    expect(result.sourceControl).toBeUndefined();
    expect(result.issueTracking).toBeUndefined();
    expect(result.communication).toEqual([]);
    expect(result.designDocs).toEqual([]);
  });

  test("should accept valid integrations", () => {
    const result = IntegrationsSchema.parse({
      sourceControl: "github",
      issueTracking: "linear",
      communication: ["slack", "discord"],
      designDocs: ["figma"],
    });

    expect(result.sourceControl).toBe("github");
    expect(result.issueTracking).toBe("linear");
    expect(result.communication).toEqual(["slack", "discord"]);
    expect(result.designDocs).toEqual(["figma"]);
  });

  test("should reject invalid integration values", () => {
    expect(() => IntegrationsSchema.parse({ sourceControl: "svn" })).toThrow();
    expect(() => IntegrationsSchema.parse({ issueTracking: "trello" })).toThrow();
    expect(() => IntegrationsSchema.parse({ communication: ["telegram"] })).toThrow();
  });
});

describe("RepositorySchema", () => {
  test("should validate repository config", () => {
    const result = RepositorySchema.parse({
      name: "frontend",
      path: "./apps/frontend",
      role: "primary",
    });

    expect(result.name).toBe("frontend");
    expect(result.path).toBe("./apps/frontend");
    expect(result.role).toBe("primary");
    expect(result.branch).toBe("main"); // default
  });

  test("should require name and path", () => {
    expect(() => RepositorySchema.parse({ role: "primary" })).toThrow();
    expect(() => RepositorySchema.parse({ name: "", path: "./path", role: "primary" })).toThrow();
  });

  test("should validate role", () => {
    expect(() =>
      RepositorySchema.parse({
        name: "test",
        path: "./test",
        role: "secondary",
      })
    ).toThrow();
  });
});

describe("SquadConfigSchema", () => {
  test("should validate complete config", () => {
    const config = {
      projectName: "my-project",
      projectPath: "/path/to/project",
      defaults: {
        workflow: "feature",
        model: "sonnet",
        maxConcurrentAgents: 5,
        reviewGateBehavior: "pause",
      },
      integrations: {
        sourceControl: "github",
        issueTracking: "linear",
        communication: ["slack"],
      },
    };

    const result = SquadConfigSchema.parse(config);

    expect(result.projectName).toBe("my-project");
    expect(result.defaults.model).toBe("sonnet");
    expect(result.integrations.sourceControl).toBe("github");
  });

  test("should require projectName", () => {
    expect(() => SquadConfigSchema.parse({})).toThrow();
    expect(() => SquadConfigSchema.parse({ projectName: "" })).toThrow();
  });

  test("should apply defaults", () => {
    const result = SquadConfigSchema.parse({ projectName: "test" });

    expect(result.defaults.workflow).toBe("feature");
    expect(result.defaults.model).toBe("sonnet");
    expect(result.integrations.communication).toEqual([]);
  });

  test("should validate nested optional objects", () => {
    const config = {
      projectName: "test",
      agents: {
        enabled: ["architect", "backend"],
        disabled: ["qa"],
      },
      workflows: {
        default: "bugfix",
      },
      costs: {
        sessionLimit: 100,
        featureLimit: 50,
        alertThreshold: 0.8,
      },
    };

    const result = SquadConfigSchema.parse(config);

    expect(result.agents?.enabled).toEqual(["architect", "backend"]);
    expect(result.workflows?.default).toBe("bugfix");
    expect(result.costs?.alertThreshold).toBe(0.8);
  });

  test("should validate costs constraints", () => {
    expect(() =>
      SquadConfigSchema.parse({
        projectName: "test",
        costs: { sessionLimit: -1 },
      })
    ).toThrow();

    expect(() =>
      SquadConfigSchema.parse({
        projectName: "test",
        costs: { alertThreshold: 1.5 },
      })
    ).toThrow();
  });
});

describe("validateConfig", () => {
  test("should return validated config", () => {
    const config = { projectName: "test" };
    const result = validateConfig(config);

    expect(result.projectName).toBe("test");
    expect(result.defaults).toBeDefined();
  });

  test("should throw on invalid config", () => {
    expect(() => validateConfig({})).toThrow();
    expect(() => validateConfig({ projectName: 123 })).toThrow();
  });
});

describe("safeValidateConfig", () => {
  test("should return success for valid config", () => {
    const result = safeValidateConfig({ projectName: "test" });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  test("should return error for invalid config", () => {
    const result = safeValidateConfig({});

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });
});

describe("formatValidationErrors", () => {
  test("should format errors nicely", () => {
    const result = safeValidateConfig({});

    if (!result.success && result.error) {
      const formatted = formatValidationErrors(result.error);

      expect(formatted).toContain("Configuration validation failed");
      expect(formatted).toContain("projectName");
    }
  });
});

describe("DEFAULT_CONFIG", () => {
  test("should have expected defaults", () => {
    expect(DEFAULT_CONFIG.defaults?.workflow).toBe("feature");
    expect(DEFAULT_CONFIG.defaults?.model).toBe("sonnet");
    expect(DEFAULT_CONFIG.defaults?.maxConcurrentAgents).toBe(5);
  });
});
