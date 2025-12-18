/**
 * Keychain Service
 *
 * High-level service for managing credentials across platforms.
 * Auto-detects the appropriate provider based on the current OS.
 */

import type {
  KeychainProvider,
  KeychainResult,
  KeychainProviderType,
  StoreOptions,
  RetrieveOptions,
  DeleteOptions,
} from "./types.js";
import { KEYCHAIN_SERVICES, API_KEY_ACCOUNTS } from "./types.js";
import {
  MacOSKeychainProvider,
  LinuxSecretServiceProvider,
  WindowsCredentialManagerProvider,
  MemoryKeychainProvider,
} from "./providers/index.js";

/**
 * Keychain service configuration
 */
export interface KeychainServiceConfig {
  /** Preferred provider type (auto-detected if not specified) */
  preferredProvider?: KeychainProviderType;
  /** Whether to fall back to memory provider if native isn't available */
  fallbackToMemory?: boolean;
  /** Custom service name prefix for all operations */
  servicePrefix?: string;
}

/**
 * API Key storage result
 */
export interface ApiKeyInfo {
  /** The key name/account */
  name: string;
  /** Whether the key is stored */
  isStored: boolean;
  /** When the key was last updated (if available) */
  updatedAt?: Date;
}

/**
 * Keychain Service
 *
 * Provides a unified interface for storing and retrieving secrets
 * across different platforms. Automatically selects the best available
 * provider based on the current operating system.
 *
 * Provider selection order:
 * 1. User-specified preferred provider
 * 2. Native OS provider (macOS Keychain, Linux Secret Service, Windows Credential Manager)
 * 3. Memory provider (if fallback enabled)
 *
 * @example
 * ```typescript
 * // Create service with auto-detection
 * const keychain = new KeychainService();
 * await keychain.initialize();
 *
 * // Store an API key
 * await keychain.setApiKey('anthropic', 'sk-ant-123...');
 *
 * // Retrieve an API key
 * const key = await keychain.getApiKey('anthropic');
 *
 * // Store an integration token
 * await keychain.setIntegrationToken('github', 'ghp_123...');
 * ```
 */
export class KeychainService {
  private provider: KeychainProvider | null = null;
  private readonly config: Required<KeychainServiceConfig>;
  private initialized = false;

  constructor(config: KeychainServiceConfig = {}) {
    this.config = {
      preferredProvider: config.preferredProvider ?? undefined!,
      fallbackToMemory: config.fallbackToMemory ?? true,
      servicePrefix: config.servicePrefix ?? "claude-squad",
    };
  }

  /**
   * Initialize the service and select the appropriate provider
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Try preferred provider first
    if (this.config.preferredProvider) {
      const provider = this.createProvider(this.config.preferredProvider);
      if (await provider.isAvailable()) {
        this.provider = provider;
        this.initialized = true;
        return;
      }
    }

    // Try native providers in order of platform preference
    const providers = this.getNativeProviders();

    for (const provider of providers) {
      if (await provider.isAvailable()) {
        this.provider = provider;
        this.initialized = true;
        return;
      }
    }

    // Fall back to memory if enabled
    if (this.config.fallbackToMemory) {
      this.provider = new MemoryKeychainProvider();
      this.initialized = true;
      return;
    }

    throw new Error("No keychain provider available");
  }

  /**
   * Create a provider by type
   */
  private createProvider(type: KeychainProviderType): KeychainProvider {
    switch (type) {
      case "macos-keychain":
        return new MacOSKeychainProvider();
      case "linux-secret-service":
        return new LinuxSecretServiceProvider();
      case "windows-credential-manager":
        return new WindowsCredentialManagerProvider();
      case "memory":
        return new MemoryKeychainProvider();
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }

  /**
   * Get native providers for the current platform
   */
  private getNativeProviders(): KeychainProvider[] {
    switch (process.platform) {
      case "darwin":
        return [new MacOSKeychainProvider()];
      case "linux":
        return [new LinuxSecretServiceProvider()];
      case "win32":
        return [new WindowsCredentialManagerProvider()];
      default:
        return [];
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.provider) {
      throw new Error("KeychainService not initialized. Call initialize() first.");
    }
  }

  /**
   * Get the current provider type
   */
  getProviderType(): KeychainProviderType | null {
    return this.provider?.type ?? null;
  }

  /**
   * Check if using the memory (fallback) provider
   */
  isUsingMemoryProvider(): boolean {
    return this.provider?.type === "memory";
  }

  // ==========================================================================
  // Low-Level Operations
  // ==========================================================================

  /**
   * Store a credential
   */
  async store(options: StoreOptions): Promise<KeychainResult> {
    this.ensureInitialized();
    return this.provider!.store(options);
  }

  /**
   * Retrieve a credential
   */
  async retrieve(options: RetrieveOptions): Promise<KeychainResult<string>> {
    this.ensureInitialized();
    return this.provider!.retrieve(options);
  }

  /**
   * Delete a credential
   */
  async delete(options: DeleteOptions): Promise<KeychainResult> {
    this.ensureInitialized();
    return this.provider!.delete(options);
  }

  // ==========================================================================
  // API Key Management
  // ==========================================================================

  /**
   * Store an API key
   *
   * @param keyName - Name of the API key (e.g., 'anthropic', 'openai')
   * @param secret - The API key value
   */
  async setApiKey(keyName: string, secret: string): Promise<KeychainResult> {
    this.ensureInitialized();

    return this.provider!.store({
      service: KEYCHAIN_SERVICES.API_KEYS,
      account: keyName,
      secret,
      label: `${this.config.servicePrefix} API Key: ${keyName}`,
      update: true,
    });
  }

  /**
   * Retrieve an API key
   *
   * @param keyName - Name of the API key to retrieve
   * @returns The API key value, or null if not found
   */
  async getApiKey(keyName: string): Promise<string | null> {
    this.ensureInitialized();

    const result = await this.provider!.retrieve({
      service: KEYCHAIN_SERVICES.API_KEYS,
      account: keyName,
    });

    return result.success ? result.data! : null;
  }

  /**
   * Delete an API key
   *
   * @param keyName - Name of the API key to delete
   */
  async deleteApiKey(keyName: string): Promise<KeychainResult> {
    this.ensureInitialized();

    return this.provider!.delete({
      service: KEYCHAIN_SERVICES.API_KEYS,
      account: keyName,
    });
  }

  /**
   * Check if an API key exists
   *
   * @param keyName - Name of the API key
   */
  async hasApiKey(keyName: string): Promise<boolean> {
    const result = await this.getApiKey(keyName);
    return result !== null;
  }

  /**
   * Get information about all stored API keys
   */
  async listApiKeys(): Promise<ApiKeyInfo[]> {
    this.ensureInitialized();

    // Check known API key accounts
    const knownAccounts = Object.values(API_KEY_ACCOUNTS);
    const results: ApiKeyInfo[] = [];

    for (const account of knownAccounts) {
      const hasKey = await this.hasApiKey(account);
      results.push({
        name: account,
        isStored: hasKey,
      });
    }

    return results;
  }

  // ==========================================================================
  // Integration Token Management
  // ==========================================================================

  /**
   * Store an integration token
   *
   * @param integrationName - Name of the integration (e.g., 'github', 'linear')
   * @param token - The token value
   */
  async setIntegrationToken(
    integrationName: string,
    token: string
  ): Promise<KeychainResult> {
    this.ensureInitialized();

    return this.provider!.store({
      service: KEYCHAIN_SERVICES.INTEGRATION_TOKENS,
      account: integrationName,
      secret: token,
      label: `${this.config.servicePrefix} Integration: ${integrationName}`,
      update: true,
    });
  }

  /**
   * Retrieve an integration token
   *
   * @param integrationName - Name of the integration
   * @returns The token value, or null if not found
   */
  async getIntegrationToken(integrationName: string): Promise<string | null> {
    this.ensureInitialized();

    const result = await this.provider!.retrieve({
      service: KEYCHAIN_SERVICES.INTEGRATION_TOKENS,
      account: integrationName,
    });

    return result.success ? result.data! : null;
  }

  /**
   * Delete an integration token
   *
   * @param integrationName - Name of the integration
   */
  async deleteIntegrationToken(
    integrationName: string
  ): Promise<KeychainResult> {
    this.ensureInitialized();

    return this.provider!.delete({
      service: KEYCHAIN_SERVICES.INTEGRATION_TOKENS,
      account: integrationName,
    });
  }

  /**
   * Check if an integration token exists
   */
  async hasIntegrationToken(integrationName: string): Promise<boolean> {
    const result = await this.getIntegrationToken(integrationName);
    return result !== null;
  }

  // ==========================================================================
  // Convenience Methods for Common API Keys
  // ==========================================================================

  /**
   * Get Anthropic API key
   */
  async getAnthropicApiKey(): Promise<string | null> {
    return this.getApiKey(API_KEY_ACCOUNTS.ANTHROPIC);
  }

  /**
   * Set Anthropic API key
   */
  async setAnthropicApiKey(key: string): Promise<KeychainResult> {
    return this.setApiKey(API_KEY_ACCOUNTS.ANTHROPIC, key);
  }

  /**
   * Get GitHub token
   */
  async getGitHubToken(): Promise<string | null> {
    return this.getIntegrationToken(API_KEY_ACCOUNTS.GITHUB);
  }

  /**
   * Set GitHub token
   */
  async setGitHubToken(token: string): Promise<KeychainResult> {
    return this.setIntegrationToken(API_KEY_ACCOUNTS.GITHUB, token);
  }

  /**
   * Get Linear API key
   */
  async getLinearApiKey(): Promise<string | null> {
    return this.getIntegrationToken(API_KEY_ACCOUNTS.LINEAR);
  }

  /**
   * Set Linear API key
   */
  async setLinearApiKey(key: string): Promise<KeychainResult> {
    return this.setIntegrationToken(API_KEY_ACCOUNTS.LINEAR, key);
  }

  /**
   * Get Slack token
   */
  async getSlackToken(): Promise<string | null> {
    return this.getIntegrationToken(API_KEY_ACCOUNTS.SLACK);
  }

  /**
   * Set Slack token
   */
  async setSlackToken(token: string): Promise<KeychainResult> {
    return this.setIntegrationToken(API_KEY_ACCOUNTS.SLACK, token);
  }
}

/**
 * Create a keychain service instance
 */
export function createKeychainService(
  config?: KeychainServiceConfig
): KeychainService {
  return new KeychainService(config);
}

/**
 * Singleton instance (lazy-initialized)
 */
let defaultInstance: KeychainService | null = null;

/**
 * Get the default keychain service instance
 *
 * This provides a convenient singleton for simple use cases.
 */
export async function getKeychainService(): Promise<KeychainService> {
  if (!defaultInstance) {
    defaultInstance = createKeychainService();
    await defaultInstance.initialize();
  }
  return defaultInstance;
}
