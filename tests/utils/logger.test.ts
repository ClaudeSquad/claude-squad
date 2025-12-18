/**
 * Logger Tests
 *
 * Tests for the logging utility.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { logger, LogLevel } from "../../src/utils/logger.js";

describe("Logger", () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;
  let consoleWarnSpy: ReturnType<typeof spyOn>;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    // Reset logger to default config
    logger.configure({
      level: LogLevel.DEBUG,
      timestamps: false,
      colors: false,
      prefix: undefined,
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("Log Levels", () => {
    test("should log debug messages when level is DEBUG", () => {
      logger.setLevel(LogLevel.DEBUG);
      logger.debug("test debug");

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("DEBUG");
      expect(output).toContain("test debug");
    });

    test("should not log debug messages when level is INFO", () => {
      logger.setLevel(LogLevel.INFO);
      logger.debug("test debug");

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test("should log info messages", () => {
      logger.setLevel(LogLevel.INFO);
      logger.info("test info");

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("INFO");
      expect(output).toContain("test info");
    });

    test("should log warn messages", () => {
      logger.warn("test warn");

      expect(consoleWarnSpy).toHaveBeenCalled();
      const output = consoleWarnSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("WARN");
      expect(output).toContain("test warn");
    });

    test("should log error messages", () => {
      logger.error("test error");

      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("ERROR");
      expect(output).toContain("test error");
    });

    test("should not log anything when level is SILENT", () => {
      logger.setLevel(LogLevel.SILENT);

      logger.debug("test");
      logger.info("test");
      logger.warn("test");
      logger.error("test");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("Context", () => {
    test("should include context in log output", () => {
      logger.info("test message", { key: "value", num: 42 });

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("test message");
      expect(output).toContain('"key":"value"');
      expect(output).toContain('"num":42');
    });
  });

  describe("Configuration", () => {
    test("should set prefix", () => {
      logger.setPrefix("TestModule");
      logger.info("test message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("[TestModule]");
    });

    test("should configure multiple options", () => {
      logger.configure({
        level: LogLevel.WARN,
        timestamps: true,
        colors: false,
      });

      logger.info("should not appear");
      logger.warn("should appear");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe("Child Logger", () => {
    test("should create child logger with prefix", () => {
      const childLogger = logger.child("ChildModule");
      childLogger.info("child message");

      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(output).toContain("[ChildModule]");
      expect(output).toContain("child message");
    });

    test("child logger should respect log level", () => {
      logger.setLevel(LogLevel.WARN);
      const childLogger = logger.child("ChildModule");

      childLogger.info("should not appear");
      childLogger.warn("should appear");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });
});
