/**
 * Memory Keychain Provider
 *
 * In-memory implementation for testing and as a fallback when
 * no native keychain is available. Credentials are NOT persisted.
 */

import type {
  KeychainProvider,
  KeychainResult,
  KeychainEntry,
  StoreOptions,
  RetrieveOptions,
  DeleteOptions,
  FindOptions,
} from "../types.js";

/**
 * Memory Keychain Provider
 *
 * Stores credentials in memory only - they are lost when the process
 * exits. This provider is useful for:
 *
 * 1. Testing without touching the system keychain
 * 2. CI/CD environments where no keychain is available
 * 3. Fallback when native providers aren't available
 *
 * WARNING: Credentials stored here are not persisted and are only
 * as secure as the process memory.
 *
 * @example
 * ```typescript
 * const provider = new MemoryKeychainProvider();
 *
 * // Memory provider is always available
 * await provider.store({
 *   service: 'my-app',
 *   account: 'api-key',
 *   secret: 'sk-123...'
 * });
 *
 * // Pre-populate credentials (useful for testing)
 * provider.setCredentials(new Map([
 *   ['service:account', { service, account, secret, ... }]
 * ]));
 * ```
 */
export class MemoryKeychainProvider implements KeychainProvider {
  readonly type = "memory" as const;

  private credentials: Map<string, KeychainEntry> = new Map();

  /**
   * Generate a key for the internal map
   */
  private makeKey(service: string, account: string): string {
    return `${service}:${account}`;
  }

  /**
   * Memory provider is always available
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Store a credential in memory
   */
  async store(options: StoreOptions): Promise<KeychainResult> {
    const { service, account, secret, label } = options;
    const key = this.makeKey(service, account);
    const now = new Date();

    const existing = this.credentials.get(key);

    this.credentials.set(key, {
      service,
      account,
      secret,
      label,
      createdAt: existing?.createdAt ?? now,
      modifiedAt: now,
    });

    return { success: true };
  }

  /**
   * Retrieve a credential from memory
   */
  async retrieve(options: RetrieveOptions): Promise<KeychainResult<string>> {
    const { service, account } = options;
    const key = this.makeKey(service, account);

    const entry = this.credentials.get(key);
    if (!entry) {
      return {
        success: false,
        error: "Credential not found",
        code: "NOT_FOUND",
      };
    }

    return {
      success: true,
      data: entry.secret,
    };
  }

  /**
   * Delete a credential from memory
   */
  async delete(options: DeleteOptions): Promise<KeychainResult> {
    const { service, account } = options;
    const key = this.makeKey(service, account);

    this.credentials.delete(key);
    return { success: true };
  }

  /**
   * Find credentials matching criteria
   */
  async find(options: FindOptions): Promise<KeychainResult<KeychainEntry[]>> {
    const results: KeychainEntry[] = [];

    for (const entry of this.credentials.values()) {
      const matchesService = !options.service || entry.service === options.service;
      const matchesAccount = !options.account || entry.account === options.account;

      if (matchesService && matchesAccount) {
        results.push({ ...entry });
      }
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * List all credentials for a service
   */
  async list(service: string): Promise<KeychainResult<KeychainEntry[]>> {
    return this.find({ service });
  }

  // ==========================================================================
  // Test Helpers
  // ==========================================================================

  /**
   * Clear all credentials (useful for testing)
   */
  clear(): void {
    this.credentials.clear();
  }

  /**
   * Get all credentials (useful for testing)
   */
  getAll(): Map<string, KeychainEntry> {
    return new Map(this.credentials);
  }

  /**
   * Set credentials directly (useful for test setup)
   */
  setCredentials(credentials: Map<string, KeychainEntry>): void {
    this.credentials = new Map(credentials);
  }

  /**
   * Get count of stored credentials
   */
  size(): number {
    return this.credentials.size;
  }
}
