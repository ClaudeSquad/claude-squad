/**
 * Command Parser Tests
 *
 * Tests for the command parsing and argument extraction logic.
 */

import { describe, it, expect } from "bun:test";
import { CommandParser, ParseError } from "../../../src/core/commands/parser.js";
import type { ArgumentDefinition } from "../../../src/core/commands/types.js";

describe("CommandParser", () => {
  const parser = new CommandParser();

  describe("parse", () => {
    it("should parse simple command without arguments", () => {
      const result = parser.parse("/help");
      expect(result.command).toBe("help");
      expect(result.args.positional).toEqual([]);
      expect(result.args.named).toEqual({});
      expect(result.args.flags.size).toBe(0);
    });

    it("should parse command with positional arguments", () => {
      const result = parser.parse("/create feature login-system");
      expect(result.command).toBe("create");
      expect(result.args.positional).toEqual(["feature", "login-system"]);
    });

    it("should parse command with named arguments", () => {
      const result = parser.parse("/agent --role architect --model opus");
      expect(result.command).toBe("agent");
      expect(result.args.named.role).toBe("architect");
      expect(result.args.named.model).toBe("opus");
    });

    it("should parse command with boolean flags", () => {
      const result = parser.parse("/run --verbose");
      expect(result.command).toBe("run");
      expect(result.args.flags.has("verbose")).toBe(true);
    });

    it("should parse command with short flags", () => {
      const result = parser.parse("/run -v -n test");
      expect(result.command).toBe("run");
      expect(result.args.flags.has("v")).toBe(true);
      expect(result.args.named.n).toBe("test");
    });

    it("should parse command with equals-style flags", () => {
      const result = parser.parse("/config --setting=value");
      expect(result.command).toBe("config");
      expect(result.args.named.setting).toBe("value");
    });

    it("should handle quoted strings", () => {
      const result = parser.parse('/create feature "add login system"');
      expect(result.command).toBe("create");
      expect(result.args.positional).toEqual(["feature", "add login system"]);
    });

    it("should handle single-quoted strings", () => {
      const result = parser.parse("/describe 'This is a long description'");
      expect(result.command).toBe("describe");
      expect(result.args.positional).toEqual(["This is a long description"]);
    });

    it("should handle mixed positional args and named args", () => {
      const result = parser.parse("/spawn architect --model opus task1 --priority high");
      expect(result.command).toBe("spawn");
      expect(result.args.positional).toContain("architect");
      expect(result.args.positional).toContain("task1");
      expect(result.args.named.model).toBe("opus");
      expect(result.args.named.priority).toBe("high");
    });

    it("should handle commands without leading slash", () => {
      const result = parser.parse("help");
      expect(result.command).toBe("help");
    });

    it("should handle multiple short flags combined", () => {
      const result = parser.parse("/run -abc");
      expect(result.args.flags.has("a")).toBe(true);
      expect(result.args.flags.has("b")).toBe(true);
      expect(result.args.flags.has("c")).toBe(true);
    });

    it("should parse numbers from named args", () => {
      const result = parser.parse("/config --port 3000 --retries 5");
      expect(result.args.named.port).toBe(3000);
      expect(result.args.named.retries).toBe(5);
    });

    it("should parse booleans from named args", () => {
      const result = parser.parse("/config --enabled true --disabled false");
      expect(result.args.named.enabled).toBe(true);
      expect(result.args.named.disabled).toBe(false);
    });

    it("should handle escaped quotes", () => {
      const result = parser.parse('/say "He said \\"hello\\""');
      expect(result.args.positional[0]).toBe('He said "hello"');
    });

    it("should handle consecutive spaces", () => {
      const result = parser.parse("/cmd   arg1    arg2");
      expect(result.args.positional).toEqual(["arg1", "arg2"]);
    });

    it("should preserve raw input", () => {
      const input = '/feature "add login" --workflow web-app';
      const result = parser.parse(input);
      expect(result.args.raw).toBe(input);
    });
  });

  describe("validate", () => {
    const definitions: ArgumentDefinition[] = [
      {
        name: "name",
        type: "string",
        required: true,
        positional: true,
        description: "The name",
      },
      {
        name: "count",
        type: "number",
        required: false,
        default: 1,
        description: "The count",
      },
      {
        name: "verbose",
        type: "boolean",
        required: false,
        aliases: ["v"],
        description: "Verbose output",
      },
      {
        name: "model",
        type: "string",
        required: false,
        choices: ["sonnet", "opus", "haiku"],
        description: "Model to use",
      },
    ];

    it("should validate and extract positional arguments", () => {
      const args = parser.parse("/test myname").args;
      const result = parser.validate(args, definitions);

      expect(result.name).toBe("myname");
      expect(result.count).toBe(1); // default value
    });

    it("should validate named arguments", () => {
      const args = parser.parse("/test myname --count 5 --verbose").args;
      const result = parser.validate(args, definitions);

      expect(result.name).toBe("myname");
      expect(result.count).toBe(5);
      expect(result.verbose).toBe(true);
    });

    it("should resolve aliases", () => {
      const args = parser.parse("/test myname -v").args;
      const result = parser.validate(args, definitions);

      expect(result.verbose).toBe(true);
    });

    it("should throw on missing required arguments", () => {
      const args = parser.parse("/test").args;

      expect(() => parser.validate(args, definitions)).toThrow(ParseError);
    });

    it("should throw on invalid choices", () => {
      const args = parser.parse("/test myname --model invalid").args;

      expect(() => parser.validate(args, definitions)).toThrow(ParseError);
    });

    it("should return extra positional args in _ array", () => {
      const args = parser.parse("/test myname extra1 extra2").args;
      const result = parser.validate(args, definitions);

      expect(result._).toEqual(["extra1", "extra2"]);
    });

    it("should return flags in _flags array", () => {
      const args = parser.parse("/test myname --verbose").args;
      const result = parser.validate(args, definitions);

      expect(result._flags).toBeDefined();
    });
  });

  describe("no definitions", () => {
    it("should return raw args when no definitions provided", () => {
      const args = parser.parse("/cmd arg1 arg2 --flag value").args;
      const result = parser.validate(args);

      expect(result._).toEqual(["arg1", "arg2"]);
      expect(result.flag).toBe("value");
    });
  });
});
