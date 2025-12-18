/**
 * Keychain Types
 *
 * Type definitions for cross-platform secure credential storage.
 */

/**
 * Supported keychain provider types
 */
export type KeychainProviderType =
  | "macos-keychain"
  | "linux-secret-service"
  | "windows-credential-manager"
  | "memory"; // For testing or fallback

/**
 * A stored credential entry
 */
export interface KeychainEntry {
  /** Service/application name */
  service: string;
  /** Account/key identifier */
  account: string;
  /** The secret value */
  secret: string;
  /** Optional label/description */
  label?: string;
  /** When the entry was created */
  createdAt?: Date;
  /** When the entry was last modified */
  modifiedAt?: Date;
}

/**
 * Options for storing a credential
 */
export interface StoreOptions {
  /** Service/application name */
  service: string;
  /** Account/key identifier */
  account: string;
  /** The secret value to store */
  secret: string;
  /** Optional label/description */
  label?: string;
  /** Whether to update if exists */
  update?: boolean;
}

/**
 * Options for retrieving a credential
 */
export interface RetrieveOptions {
  /** Service/application name */
  service: string;
  /** Account/key identifier */
  account: string;
}

/**
 * Options for deleting a credential
 */
export interface DeleteOptions {
  /** Service/application name */
  service: string;
  /** Account/key identifier */
  account: string;
}

/**
 * Options for finding credentials
 */
export interface FindOptions {
  /** Service name pattern (exact match) */
  service?: string;
  /** Account name pattern (exact match) */
  account?: string;
}

/**
 * Result of a keychain operation
 */
export interface KeychainResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error message if failed */
  error?: string;
  /** Error code if available */
  code?: string;
}

/**
 * Keychain provider interface
 *
 * All platform-specific implementations must implement this interface.
 */
export interface KeychainProvider {
  /** Provider type identifier */
  readonly type: KeychainProviderType;

  /** Whether this provider is available on the current platform */
  isAvailable(): Promise<boolean>;

  /** Store a credential */
  store(options: StoreOptions): Promise<KeychainResult>;

  /** Retrieve a credential */
  retrieve(options: RetrieveOptions): Promise<KeychainResult<string>>;

  /** Delete a credential */
  delete(options: DeleteOptions): Promise<KeychainResult>;

  /** Find credentials matching criteria */
  find(options: FindOptions): Promise<KeychainResult<KeychainEntry[]>>;

  /** List all credentials for a service */
  list(service: string): Promise<KeychainResult<KeychainEntry[]>>;
}

/**
 * Well-known service names used by Claude Squad
 */
export const KEYCHAIN_SERVICES = {
  /** API keys for various services */
  API_KEYS: "claude-squad-api-keys",
  /** Integration tokens (GitHub, Linear, etc.) */
  INTEGRATION_TOKENS: "claude-squad-integrations",
  /** Encryption keys */
  ENCRYPTION_KEYS: "claude-squad-encryption",
} as const;

/**
 * Well-known account names for API keys
 */
export const API_KEY_ACCOUNTS = {
  ANTHROPIC: "anthropic-api-key",
  OPENAI: "openai-api-key",
  GITHUB: "github-token",
  LINEAR: "linear-api-key",
  SLACK: "slack-token",
  DISCORD: "discord-token",
} as const;
