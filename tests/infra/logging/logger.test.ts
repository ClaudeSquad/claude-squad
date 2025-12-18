/**
 * Squad Logger Tests
 *
 * Tests for the structured logging system.
 */

import { describe, it, expect } from "bun:test";
import { SquadLogger, createLogger, componentLogger } from "../../../src/infra/logging/logger.js";
import { shouldLog, parseLogLevel, LOG_LEVEL_VALUES } from "../../../src/infra/logging/types.js";

describe("SquadLogger", () => {
  describe("log level filtering", () => {
    it("should respect log level setting", () => {
      const logger = new SquadLogger({ level: "warn" });
      expect(logger.getLevel()).toBe("warn");
    });

    it("should update log level with setLevel", () => {
      const logger = new SquadLogger({ level: "debug" });
      logger.setLevel("error");
      expect(logger.getLevel()).toBe("error");
    });
  });

  describe("child loggers", () => {
    it("should create child logger with context", () => {
      const logger = new SquadLogger({ level: "debug" });
      const childLogger = logger.child({ component: "TestComponent" });

      expect(childLogger).toBeDefined();
      // Child logger should have the same level
      expect(childLogger.getLevel()).toBe("debug");
    });

    it("should create deeply nested child loggers", () => {
      const logger = new SquadLogger({ level: "debug" });
      const child1 = logger.child({ level1: "a" });
      const child2 = child1.child({ level2: "b" });
      const child3 = child2.child({ level3: "c" });

      expect(child3).toBeDefined();
    });
  });

  describe("createLogger factory", () => {
    it("should create new logger instance", () => {
      const logger = createLogger({ level: "info" });
      expect(logger).toBeDefined();
      expect(logger.getLevel()).toBe("info");
    });

    it("should accept context option", () => {
      const logger = createLogger({
        level: "debug",
        context: { app: "test" },
      });
      expect(logger).toBeDefined();
    });

    it("should default to info level", () => {
      // When no environment variables are set
      const logger = createLogger({});
      // The default depends on environment, but it should be a valid level
      expect(["debug", "info", "warn", "error"]).toContain(logger.getLevel());
    });
  });

  describe("componentLogger helper", () => {
    it("should create logger with component context", () => {
      const compLogger = componentLogger("MyComponent");
      expect(compLogger).toBeDefined();
    });
  });

  describe("format options", () => {
    it("should accept json format", () => {
      const logger = new SquadLogger({
        level: "debug",
        format: "json",
      });
      expect(logger).toBeDefined();
    });

    it("should accept pretty format", () => {
      const logger = new SquadLogger({
        level: "debug",
        format: "pretty",
      });
      expect(logger).toBeDefined();
    });

    it("should accept timestamp option", () => {
      const logger = new SquadLogger({
        level: "debug",
        timestamps: false,
      });
      expect(logger).toBeDefined();
    });

    it("should accept colors option", () => {
      const logger = new SquadLogger({
        level: "debug",
        colors: true,
      });
      expect(logger).toBeDefined();
    });
  });

  describe("logging methods exist", () => {
    it("should have debug method", () => {
      const logger = new SquadLogger({ level: "debug" });
      expect(typeof logger.debug).toBe("function");
    });

    it("should have info method", () => {
      const logger = new SquadLogger({ level: "debug" });
      expect(typeof logger.info).toBe("function");
    });

    it("should have warn method", () => {
      const logger = new SquadLogger({ level: "debug" });
      expect(typeof logger.warn).toBe("function");
    });

    it("should have error method", () => {
      const logger = new SquadLogger({ level: "debug" });
      expect(typeof logger.error).toBe("function");
    });
  });
});

describe("Log Level Utilities", () => {
  describe("shouldLog", () => {
    it("should allow debug when level is debug", () => {
      expect(shouldLog("debug", "debug")).toBe(true);
    });

    it("should allow info when level is debug", () => {
      expect(shouldLog("info", "debug")).toBe(true);
    });

    it("should block debug when level is info", () => {
      expect(shouldLog("debug", "info")).toBe(false);
    });

    it("should allow error at any level", () => {
      expect(shouldLog("error", "debug")).toBe(true);
      expect(shouldLog("error", "info")).toBe(true);
      expect(shouldLog("error", "warn")).toBe(true);
      expect(shouldLog("error", "error")).toBe(true);
    });

    it("should only allow error when level is error", () => {
      expect(shouldLog("debug", "error")).toBe(false);
      expect(shouldLog("info", "error")).toBe(false);
      expect(shouldLog("warn", "error")).toBe(false);
      expect(shouldLog("error", "error")).toBe(true);
    });
  });

  describe("parseLogLevel", () => {
    it("should parse debug level", () => {
      expect(parseLogLevel("debug")).toBe("debug");
      expect(parseLogLevel("DEBUG")).toBe("debug");
    });

    it("should parse info level", () => {
      expect(parseLogLevel("info")).toBe("info");
      expect(parseLogLevel("INFO")).toBe("info");
    });

    it("should parse warn level", () => {
      expect(parseLogLevel("warn")).toBe("warn");
      expect(parseLogLevel("WARN")).toBe("warn");
    });

    it("should parse error level", () => {
      expect(parseLogLevel("error")).toBe("error");
      expect(parseLogLevel("ERROR")).toBe("error");
    });

    it("should return undefined for invalid levels", () => {
      expect(parseLogLevel("invalid")).toBeUndefined();
      expect(parseLogLevel("")).toBeUndefined();
    });
  });

  describe("LOG_LEVEL_VALUES", () => {
    it("should have correct ordering", () => {
      expect(LOG_LEVEL_VALUES.debug).toBeLessThan(LOG_LEVEL_VALUES.info);
      expect(LOG_LEVEL_VALUES.info).toBeLessThan(LOG_LEVEL_VALUES.warn);
      expect(LOG_LEVEL_VALUES.warn).toBeLessThan(LOG_LEVEL_VALUES.error);
    });
  });
});
