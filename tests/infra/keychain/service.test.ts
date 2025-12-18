/**
 * Keychain Service Tests
 *
 * Tests for the cross-platform keychain service using memory provider.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  KeychainService,
  createKeychainService,
} from "../../../src/infra/keychain/service.js";
import { MemoryKeychainProvider } from "../../../src/infra/keychain/providers/memory.js";
import { KEYCHAIN_SERVICES, API_KEY_ACCOUNTS } from "../../../src/infra/keychain/types.js";

describe("KeychainService", () => {
  let service: KeychainService;

  beforeEach(async () => {
    // Use memory provider for testing
    service = createKeychainService({
      preferredProvider: "memory",
    });
    await service.initialize();
  });

  describe("initialization", () => {
    it("should initialize with memory provider", () => {
      expect(service.getProviderType()).toBe("memory");
      expect(service.isUsingMemoryProvider()).toBe(true);
    });

    it("should handle multiple initialize calls", async () => {
      await service.initialize();
      await service.initialize();
      expect(service.getProviderType()).toBe("memory");
    });
  });

  describe("low-level operations", () => {
    it("should store and retrieve credentials", async () => {
      const storeResult = await service.store({
        service: "test-service",
        account: "test-account",
        secret: "test-secret-123",
      });

      expect(storeResult.success).toBe(true);

      const retrieveResult = await service.retrieve({
        service: "test-service",
        account: "test-account",
      });

      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data).toBe("test-secret-123");
    });

    it("should delete credentials", async () => {
      await service.store({
        service: "test-service",
        account: "to-delete",
        secret: "secret",
      });

      const deleteResult = await service.delete({
        service: "test-service",
        account: "to-delete",
      });

      expect(deleteResult.success).toBe(true);

      const retrieveResult = await service.retrieve({
        service: "test-service",
        account: "to-delete",
      });

      expect(retrieveResult.success).toBe(false);
      expect(retrieveResult.code).toBe("NOT_FOUND");
    });

    it("should update existing credentials", async () => {
      await service.store({
        service: "test-service",
        account: "updatable",
        secret: "original",
      });

      await service.store({
        service: "test-service",
        account: "updatable",
        secret: "updated",
        update: true,
      });

      const result = await service.retrieve({
        service: "test-service",
        account: "updatable",
      });

      expect(result.data).toBe("updated");
    });
  });

  describe("API key management", () => {
    it("should set and get API keys", async () => {
      const setResult = await service.setApiKey("anthropic", "sk-ant-test-123");
      expect(setResult.success).toBe(true);

      const key = await service.getApiKey("anthropic");
      expect(key).toBe("sk-ant-test-123");
    });

    it("should return null for non-existent API keys", async () => {
      const key = await service.getApiKey("nonexistent");
      expect(key).toBeNull();
    });

    it("should check if API key exists", async () => {
      await service.setApiKey("openai", "sk-test");

      expect(await service.hasApiKey("openai")).toBe(true);
      expect(await service.hasApiKey("missing")).toBe(false);
    });

    it("should delete API keys", async () => {
      await service.setApiKey("to-remove", "secret");
      expect(await service.hasApiKey("to-remove")).toBe(true);

      await service.deleteApiKey("to-remove");
      expect(await service.hasApiKey("to-remove")).toBe(false);
    });

    it("should list API key status", async () => {
      await service.setApiKey(API_KEY_ACCOUNTS.ANTHROPIC, "key1");
      await service.setApiKey(API_KEY_ACCOUNTS.GITHUB, "key2");

      const keys = await service.listApiKeys();

      const anthropicKey = keys.find((k) => k.name === API_KEY_ACCOUNTS.ANTHROPIC);
      const githubKey = keys.find((k) => k.name === API_KEY_ACCOUNTS.GITHUB);
      const openaiKey = keys.find((k) => k.name === API_KEY_ACCOUNTS.OPENAI);

      expect(anthropicKey?.isStored).toBe(true);
      expect(githubKey?.isStored).toBe(true);
      expect(openaiKey?.isStored).toBe(false);
    });
  });

  describe("integration token management", () => {
    it("should set and get integration tokens", async () => {
      await service.setIntegrationToken("github", "ghp_test123");

      const token = await service.getIntegrationToken("github");
      expect(token).toBe("ghp_test123");
    });

    it("should check if integration token exists", async () => {
      await service.setIntegrationToken("linear", "lin_test");

      expect(await service.hasIntegrationToken("linear")).toBe(true);
      expect(await service.hasIntegrationToken("slack")).toBe(false);
    });

    it("should delete integration tokens", async () => {
      await service.setIntegrationToken("discord", "token");
      await service.deleteIntegrationToken("discord");

      expect(await service.hasIntegrationToken("discord")).toBe(false);
    });
  });

  describe("convenience methods", () => {
    it("should set and get Anthropic API key", async () => {
      await service.setAnthropicApiKey("sk-ant-convenience");
      const key = await service.getAnthropicApiKey();
      expect(key).toBe("sk-ant-convenience");
    });

    it("should set and get GitHub token", async () => {
      await service.setGitHubToken("ghp_convenience");
      const token = await service.getGitHubToken();
      expect(token).toBe("ghp_convenience");
    });

    it("should set and get Linear API key", async () => {
      await service.setLinearApiKey("lin_convenience");
      const key = await service.getLinearApiKey();
      expect(key).toBe("lin_convenience");
    });

    it("should set and get Slack token", async () => {
      await service.setSlackToken("xoxb-convenience");
      const token = await service.getSlackToken();
      expect(token).toBe("xoxb-convenience");
    });
  });

  describe("error handling", () => {
    it("should throw if not initialized", async () => {
      const uninitializedService = createKeychainService();

      expect(
        async () =>
          await uninitializedService.store({
            service: "test",
            account: "test",
            secret: "test",
          })
      ).toThrow();
    });
  });
});

describe("MemoryKeychainProvider", () => {
  let provider: MemoryKeychainProvider;

  beforeEach(() => {
    provider = new MemoryKeychainProvider();
  });

  describe("availability", () => {
    it("should always be available", async () => {
      expect(await provider.isAvailable()).toBe(true);
    });

    it("should have correct type", () => {
      expect(provider.type).toBe("memory");
    });
  });

  describe("store and retrieve", () => {
    it("should store credentials", async () => {
      const result = await provider.store({
        service: "test",
        account: "user",
        secret: "password123",
      });

      expect(result.success).toBe(true);
    });

    it("should retrieve stored credentials", async () => {
      await provider.store({
        service: "app",
        account: "key",
        secret: "value",
      });

      const result = await provider.retrieve({
        service: "app",
        account: "key",
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe("value");
    });

    it("should return NOT_FOUND for missing credentials", async () => {
      const result = await provider.retrieve({
        service: "missing",
        account: "missing",
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("NOT_FOUND");
    });
  });

  describe("find and list", () => {
    it("should find credentials by service", async () => {
      await provider.store({ service: "app", account: "key1", secret: "v1" });
      await provider.store({ service: "app", account: "key2", secret: "v2" });
      await provider.store({ service: "other", account: "key", secret: "v3" });

      const result = await provider.find({ service: "app" });

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });

    it("should list credentials for service", async () => {
      await provider.store({ service: "myapp", account: "a", secret: "1" });
      await provider.store({ service: "myapp", account: "b", secret: "2" });

      const result = await provider.list("myapp");

      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(2);
    });
  });

  describe("test helpers", () => {
    it("should clear all credentials", async () => {
      await provider.store({ service: "s", account: "a", secret: "x" });
      expect(provider.size()).toBe(1);

      provider.clear();
      expect(provider.size()).toBe(0);
    });

    it("should get all credentials", async () => {
      await provider.store({ service: "s1", account: "a1", secret: "x1" });
      await provider.store({ service: "s2", account: "a2", secret: "x2" });

      const all = provider.getAll();
      expect(all.size).toBe(2);
    });

    it("should set credentials directly", async () => {
      const credentials = new Map([
        [
          "svc:acct",
          {
            service: "svc",
            account: "acct",
            secret: "direct",
          },
        ],
      ]);

      provider.setCredentials(credentials);

      const result = await provider.retrieve({
        service: "svc",
        account: "acct",
      });

      expect(result.data).toBe("direct");
    });
  });
});
