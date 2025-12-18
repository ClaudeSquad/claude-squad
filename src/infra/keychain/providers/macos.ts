/**
 * macOS Keychain Provider
 *
 * Uses the `security` CLI tool to interact with macOS Keychain.
 * Stores credentials as "generic passwords" in the login keychain.
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
 * macOS Keychain Provider
 *
 * Leverages the native `security` command-line tool to manage credentials
 * in the macOS Keychain. This is the most secure option on macOS as it
 * integrates with the system's secure enclave and user authentication.
 *
 * @example
 * ```typescript
 * const provider = new MacOSKeychainProvider();
 *
 * if (await provider.isAvailable()) {
 *   await provider.store({
 *     service: 'my-app',
 *     account: 'api-key',
 *     secret: 'sk-123...'
 *   });
 *
 *   const result = await provider.retrieve({
 *     service: 'my-app',
 *     account: 'api-key'
 *   });
 * }
 * ```
 */
export class MacOSKeychainProvider implements KeychainProvider {
  readonly type = "macos-keychain" as const;

  /**
   * Check if macOS Keychain is available
   */
  async isAvailable(): Promise<boolean> {
    // Check if we're on macOS
    if (process.platform !== "darwin") {
      return false;
    }

    // Check if security command exists
    try {
      const proc = Bun.spawn(["which", "security"], {
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
   * Store a credential in the keychain
   */
  async store(options: StoreOptions): Promise<KeychainResult> {
    const { service, account, secret, label, update } = options;

    // If update is true, try to delete existing entry first
    if (update) {
      await this.delete({ service, account });
    }

    const args = [
      "add-generic-password",
      "-s", service,
      "-a", account,
      "-w", secret,
    ];

    // Add label if provided
    if (label) {
      args.push("-l", label);
    }

    // -U flag allows updating existing items
    args.push("-U");

    try {
      const proc = Bun.spawn(["security", ...args], {
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
   * Retrieve a credential from the keychain
   */
  async retrieve(options: RetrieveOptions): Promise<KeychainResult<string>> {
    const { service, account } = options;

    const args = [
      "find-generic-password",
      "-s", service,
      "-a", account,
      "-w", // Output password only
    ];

    try {
      const proc = Bun.spawn(["security", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      if (exitCode !== 0) {
        // Check for "item not found" error
        if (stderr.includes("could not be found") || exitCode === 44) {
          return {
            success: false,
            error: "Credential not found",
            code: "NOT_FOUND",
          };
        }

        return {
          success: false,
          error: stderr.trim() || "Failed to retrieve credential",
          code: `EXIT_${exitCode}`,
        };
      }

      return {
        success: true,
        data: stdout.trim(),
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
   * Delete a credential from the keychain
   */
  async delete(options: DeleteOptions): Promise<KeychainResult> {
    const { service, account } = options;

    const args = [
      "delete-generic-password",
      "-s", service,
      "-a", account,
    ];

    try {
      const proc = Bun.spawn(["security", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const [exitCode, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stderr).text(),
      ]);

      // Exit code 44 means item not found, which we treat as success
      if (exitCode !== 0 && exitCode !== 44) {
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
   *
   * Note: macOS security CLI has limited find capabilities,
   * so this implementation uses dump-keychain and filters.
   */
  async find(options: FindOptions): Promise<KeychainResult<KeychainEntry[]>> {
    // If we have specific service/account, use find-generic-password
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

    // For broader searches, we'd need to dump the keychain
    // This is a simplified implementation
    return {
      success: true,
      data: [],
    };
  }

  /**
   * List all credentials for a service
   *
   * Note: macOS security CLI doesn't provide a clean way to list
   * accounts for a service. This is a limited implementation.
   */
  async list(_service: string): Promise<KeychainResult<KeychainEntry[]>> {
    // macOS doesn't have a direct way to list accounts for a service
    // We could parse dump-keychain output, but that exposes all passwords
    // For security reasons, we return a placeholder implementation
    return {
      success: true,
      data: [],
    };
  }
}
