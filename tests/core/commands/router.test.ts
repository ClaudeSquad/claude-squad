/**
 * Command Router Tests
 *
 * Tests for the command routing system.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import { CommandRouter, createCommandRouter } from "../../../src/core/commands/router.js";
import type { CommandDefinition, CommandContext } from "../../../src/core/commands/types.js";

describe("CommandRouter", () => {
  let router: CommandRouter;
  let mockContext: CommandContext;

  beforeEach(() => {
    router = createCommandRouter();
    mockContext = {
      sessionId: "ses_test",
      cwd: "/test/project",
      isTui: false,
      services: {
        emit: () => {},
      },
    };
  });

  describe("registration", () => {
    it("should register a command", () => {
      const cmd: CommandDefinition = {
        name: "test",
        description: "Test command",
        handler: async () => ({ success: true }),
      };

      router.register(cmd);

      expect(router.has("test")).toBe(true);
      expect(router.get("test")).toBe(cmd);
    });

    it("should register command aliases", () => {
      const cmd: CommandDefinition = {
        name: "feature",
        description: "Create a feature",
        aliases: ["f", "feat"],
        handler: async () => ({ success: true }),
      };

      router.register(cmd);

      expect(router.has("feature")).toBe(true);
      expect(router.has("f")).toBe(true);
      expect(router.has("feat")).toBe(true);
      expect(router.get("f")).toBe(cmd);
      expect(router.get("feat")).toBe(cmd);
    });

    it("should unregister a command and its aliases", () => {
      const cmd: CommandDefinition = {
        name: "remove",
        description: "To be removed",
        aliases: ["r"],
        handler: async () => ({ success: true }),
      };

      router.register(cmd);
      expect(router.has("remove")).toBe(true);
      expect(router.has("r")).toBe(true);

      const result = router.unregister("remove");
      expect(result).toBe(true);
      expect(router.has("remove")).toBe(false);
      expect(router.has("r")).toBe(false);
    });

    it("should return false when unregistering non-existent command", () => {
      const result = router.unregister("nonexistent");
      expect(result).toBe(false);
    });

    it("should register multiple commands at once", () => {
      const commands: CommandDefinition[] = [
        { name: "cmd1", description: "Command 1", handler: async () => ({ success: true }) },
        { name: "cmd2", description: "Command 2", handler: async () => ({ success: true }) },
      ];

      router.registerAll(commands);

      expect(router.has("cmd1")).toBe(true);
      expect(router.has("cmd2")).toBe(true);
    });
  });

  describe("routing", () => {
    it("should route to registered command handler", async () => {
      const cmd: CommandDefinition = {
        name: "greet",
        description: "Greet user",
        handler: async () => ({
          success: true,
          message: "Hello!",
        }),
      };

      router.register(cmd);

      const result = await router.route("/greet", mockContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe("Hello!");
    });

    it("should pass parsed arguments to handler", async () => {
      let receivedArgs: unknown = null;

      const cmd: CommandDefinition = {
        name: "echo",
        description: "Echo message",
        handler: async (args) => {
          receivedArgs = args;
          return { success: true };
        },
      };

      router.register(cmd);

      await router.route("/echo hello world --flag value", mockContext);

      expect(receivedArgs).toBeDefined();
      expect((receivedArgs as { positional: string[] }).positional).toContain("hello");
      expect((receivedArgs as { positional: string[] }).positional).toContain("world");
    });

    it("should pass context to handler", async () => {
      let receivedContext: CommandContext | null = null;

      router.register({
        name: "context",
        description: "Context test",
        handler: async (_, ctx) => {
          receivedContext = ctx;
          return { success: true };
        },
      });

      await router.route("/context", mockContext);

      expect(receivedContext).toBeDefined();
      expect(receivedContext!.sessionId).toBe("ses_test");
    });

    it("should return error for commands not starting with /", async () => {
      const result = await router.route("help", mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("must start with /");
    });

    it("should return error for unknown commands", async () => {
      const result = await router.route("/nonexistent", mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown command");
    });

    it("should suggest similar commands for typos", async () => {
      router.register({
        name: "feature",
        description: "Create feature",
        handler: async () => ({ success: true }),
      });

      router.register({
        name: "fetch",
        description: "Fetch data",
        handler: async () => ({ success: true }),
      });

      const result = await router.route("/featuer", mockContext);

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it("should catch handler errors and return error result", async () => {
      const cmd: CommandDefinition = {
        name: "error",
        description: "Throws error",
        handler: async () => {
          throw new Error("Handler failed");
        },
      };

      router.register(cmd);

      const result = await router.route("/error", mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Handler failed");
    });

    it("should validate required arguments before calling handler", async () => {
      let handlerCalled = false;

      router.register({
        name: "strict",
        description: "Strict command",
        arguments: [
          { name: "required", type: "string", required: true, positional: true, description: "Required arg" },
        ],
        handler: async () => {
          handlerCalled = true;
          return { success: true };
        },
      });

      const result = await router.route("/strict", mockContext);

      expect(result.success).toBe(false);
      expect(handlerCalled).toBe(false);
    });
  });

  describe("getAllCommands", () => {
    it("should return all unique commands", () => {
      router.register({
        name: "cmd1",
        description: "Command 1",
        aliases: ["c1"],
        handler: async () => ({ success: true }),
      });

      router.register({
        name: "cmd2",
        description: "Command 2",
        handler: async () => ({ success: true }),
      });

      const commands = router.getAllCommands();

      // Should not include duplicates from aliases
      expect(commands.length).toBe(2);
      expect(commands.map((c) => c.name)).toContain("cmd1");
      expect(commands.map((c) => c.name)).toContain("cmd2");
    });

    it("should exclude hidden commands by default", () => {
      router.register({
        name: "visible",
        description: "Visible",
        handler: async () => ({ success: true }),
      });

      router.register({
        name: "hidden",
        description: "Hidden",
        hidden: true,
        handler: async () => ({ success: true }),
      });

      const commands = router.getAllCommands();
      expect(commands.map((c) => c.name)).toContain("visible");
      expect(commands.map((c) => c.name)).not.toContain("hidden");
    });

    it("should include hidden commands when requested", () => {
      router.register({
        name: "hidden",
        description: "Hidden",
        hidden: true,
        handler: async () => ({ success: true }),
      });

      const commands = router.getAllCommands(true);
      expect(commands.map((c) => c.name)).toContain("hidden");
    });
  });

  describe("getCommandsByCategory", () => {
    it("should group commands by category", () => {
      router.register({
        name: "spawn",
        description: "Spawn agent",
        category: "agent",
        handler: async () => ({ success: true }),
      });

      router.register({
        name: "help",
        description: "Show help",
        category: "system",
        handler: async () => ({ success: true }),
      });

      const grouped = router.getCommandsByCategory();

      expect(grouped.get("agent")?.map((c) => c.name)).toContain("spawn");
      expect(grouped.get("system")?.map((c) => c.name)).toContain("help");
    });
  });

  describe("getHelp", () => {
    it("should return help for a command", () => {
      router.register({
        name: "mycommand",
        description: "Short description",
        longDescription: "Long detailed description",
        examples: ["/mycommand arg1"],
        handler: async () => ({ success: true }),
      });

      const help = router.getHelp("mycommand");

      expect(help).toBeDefined();
      expect(help?.name).toBe("mycommand");
      expect(help?.description).toBe("Long detailed description");
      expect(help?.examples).toContain("/mycommand arg1");
    });

    it("should return undefined for non-existent command", () => {
      const help = router.getHelp("nonexistent");
      expect(help).toBeUndefined();
    });

    it("should generate usage string with arguments", () => {
      router.register({
        name: "create",
        description: "Create something",
        arguments: [
          { name: "type", type: "string", required: true, positional: true, description: "Type" },
          { name: "name", type: "string", required: false, positional: true, description: "Name" },
          { name: "force", type: "boolean", required: false, description: "Force" },
        ],
        handler: async () => ({ success: true }),
      });

      const help = router.getHelp("create");

      expect(help?.usage).toContain("/create");
      expect(help?.usage).toContain("<type>");
      expect(help?.usage).toContain("[name]");
      expect(help?.usage).toContain("[--force]");
    });
  });

  describe("generateHelpText", () => {
    it("should generate formatted help text", () => {
      router.register({
        name: "help",
        description: "Show help",
        category: "system",
        handler: async () => ({ success: true }),
      });

      router.register({
        name: "feature",
        description: "Create feature",
        category: "feature",
        handler: async () => ({ success: true }),
      });

      const helpText = router.generateHelpText();

      expect(helpText).toContain("Available commands");
      expect(helpText).toContain("/help");
      expect(helpText).toContain("/feature");
    });
  });

  describe("createCommandRouter factory", () => {
    it("should create new router instance", () => {
      const router1 = createCommandRouter();
      const router2 = createCommandRouter();

      expect(router1).not.toBe(router2);
      expect(router1).toBeInstanceOf(CommandRouter);
      expect(router2).toBeInstanceOf(CommandRouter);
    });
  });
});
