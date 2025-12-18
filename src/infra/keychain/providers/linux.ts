/**
 * Linux Secret Service Provider
 *
 * Uses `secret-tool` CLI to interact with the GNOME Keyring or
 * other Secret Service API-compatible backends (KWallet, etc.).
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
 * Linux Secret Service Provider
 *
 * Implements the KeychainProvider interface using `secret-tool`,
 * which is part of libsecret and works with:
 * - GNOME Keyring
 * - KDE KWallet (with Secret Service API enabled)
 * - Other compatible secret stores
 *
 * Credentials are stored with attributes:
 * - service: The application/service name
 * - account: The account/key identifier
 *
 * @example
 * ```typescript
 * const provider = new LinuxSecretServiceProvider();
 *
 * if (await provider.isAvailable()) {
 *   await provider.store({
 *     service: 'my-app',
 *     account: 'api-key',
 *     secret: 'sk-123...'
 *   });
 * }
 * ```
 */
export class LinuxSecretServiceProvider implements KeychainProvider {
  readonly type = "linux-secret-service" as const;

  /**
   * Check if secret-tool is available
   */
  async isAvailable(): Promise<boolean> {
    // Check if we're on Linux
    if (process.platform !== "linux") {
      return false;
    }

    // Check if secret-tool command exists
    try {
      const proc = Bun.spawn(["which", "secret-tool"], {
        stdout: "pipe",
        stderr: "pipe",
      });
      await proc.exited;
      return proc.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Store a credential in the secret service
   */
  async store(options: StoreOptions): Promise<KeychainResult> {
    const { service, account, secret, label, update } = options;

    // If update is true, delete existing entry first
    if (update) {
      await this.delete({ service, account });
    }

    const itemLabel = label ?? `${service}:${account}`;

    const args = [
      "store",
      "--label", itemLabel,
      "service", service,
      "account", account,
    ];

    try {
      // secret-tool reads the secret from stdin
      const proc = Bun.spawn(["secret-tool", ...args], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe",
      });

      // Write secret to stdin using Bun's FileSink
      const stdin = proc.stdin as import("bun").FileSink;
      stdin.write(new TextEncoder().encode(secret));
      stdin.end();

      const [exitCode, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stderr).text(),
      ]);

      if (exitCode !== 0) {
        return {
          success: false,
          error: stderr.trim() || "Failed to store credential",
          code: `EXIT_${exitCode}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "SPAWN_ERROR",
      };
    }
  }

  /**
   * Retrieve a credential from the secret service
   */
  async retrieve(options: RetrieveOptions): Promise<KeychainResult<string>> {
    const { service, account } = options;

    const args = [
      "lookup",
      "service", service,
      "account", account,
    ];

    try {
      const proc = Bun.spawn(["secret-tool", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      if (exitCode !== 0) {
        return {
          success: false,
          error: stderr.trim() || "Failed to retrieve credential",
          code: `EXIT_${exitCode}`,
        };
      }

      // Empty output means not found
      if (!stdout) {
        return {
          success: false,
          error: "Credential not found",
          code: "NOT_FOUND",
        };
      }

      return {
        success: true,
        data: stdout.trimEnd(), // Remove trailing newline
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "SPAWN_ERROR",
      };
    }
  }

  /**
   * Delete a credential from the secret service
   */
  async delete(options: DeleteOptions): Promise<KeychainResult> {
    const { service, account } = options;

    const args = [
      "clear",
      "service", service,
      "account", account,
    ];

    try {
      const proc = Bun.spawn(["secret-tool", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stderr).text(),
      ]);

      if (exitCode !== 0) {
        return {
          success: false,
          error: stderr.trim() || "Failed to delete credential",
          code: `EXIT_${exitCode}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        code: "SPAWN_ERROR",
      };
    }
  }

  /**
   * Find credentials matching criteria
   */
  async find(options: FindOptions): Promise<KeychainResult<KeychainEntry[]>> {
    // secret-tool doesn't have a search/find command
    // We can only lookup specific service+account combinations
    if (options.service && options.account) {
      const result = await this.retrieve({
        service: options.service,
        account: options.account,
      });

      if (!result.success) {
        if (result.code === "NOT_FOUND") {
          return { success: true, data: [] };
        }
        return { success: false, error: result.error, code: result.code };
      }

      return {
        success: true,
        data: [
          {
            service: options.service,
            account: options.account,
            secret: result.data!,
          },
        ],
      };
    }

    // For broader searches, we can use secret-tool search with service only
    if (options.service) {
      return this.searchByService(options.service);
    }

    return {
      success: true,
      data: [],
    };
  }

  /**
   * Search for items by service name
   */
  private async searchByService(
    service: string
  ): Promise<KeychainResult<KeychainEntry[]>> {
    const args = ["search", "--all", "service", service];

    try {
      const proc = Bun.spawn(["secret-tool", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stdout] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
      ]);

      if (exitCode !== 0) {
        // No results is not an error
        return { success: true, data: [] };
      }

      // Parse secret-tool search output
      const entries = this.parseSearchOutput(stdout, service);
      return { success: true, data: entries };
    } catch {
      return { success: true, data: [] };
    }
  }

  /**
   * Parse secret-tool search output
   *
   * Output format:
   * [/org/freedesktop/secrets/collection/login/1]
   * label = my-label
   * secret =
   * attribute.service = my-service
   * attribute.account = my-account
   */
  private parseSearchOutput(output: string, service: string): KeychainEntry[] {
    const entries: KeychainEntry[] = [];
    const blocks = output.split(/\[\/.+?\]/);

    for (const block of blocks) {
      if (!block.trim()) continue;

      const accountMatch = block.match(/attribute\.account\s*=\s*(.+)/);
      const labelMatch = block.match(/label\s*=\s*(.+)/);

      if (accountMatch && accountMatch[1]) {
        entries.push({
          service,
          account: accountMatch[1].trim(),
          secret: "", // search output doesn't include secrets by default
          label: labelMatch?.[1]?.trim(),
        });
      }
    }

    return entries;
  }

  /**
   * List all credentials for a service
   */
  async list(service: string): Promise<KeychainResult<KeychainEntry[]>> {
    return this.searchByService(service);
  }
}
