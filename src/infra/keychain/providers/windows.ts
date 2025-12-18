/**
 * Windows Credential Manager Provider
 *
 * Uses PowerShell cmdlets to interact with Windows Credential Manager.
 * Credentials are stored as "Generic" credentials.
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
 * Windows Credential Manager Provider
 *
 * Implements the KeychainProvider interface using PowerShell and the
 * Windows Credential Manager API. Credentials are stored as "Generic"
 * type credentials with the format "service:account" as the target name.
 *
 * Uses the CredentialManager PowerShell module or raw .NET calls.
 *
 * @example
 * ```typescript
 * const provider = new WindowsCredentialManagerProvider();
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
export class WindowsCredentialManagerProvider implements KeychainProvider {
  readonly type = "windows-credential-manager" as const;

  /**
   * Generate the target name used in Windows Credential Manager
   */
  private getTargetName(service: string, account: string): string {
    return `${service}:${account}`;
  }

  /**
   * Check if Windows Credential Manager is available
   */
  async isAvailable(): Promise<boolean> {
    // Check if we're on Windows
    if (process.platform !== "win32") {
      return false;
    }

    // Check if PowerShell is available and can access credentials
    try {
      const proc = Bun.spawn(
        [
          "powershell.exe",
          "-NoProfile",
          "-Command",
          "[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]; $true",
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );
      await proc.exited;
      return proc.exitCode === 0;
    } catch {
      return false;
    }
  }

  /**
   * Store a credential in Windows Credential Manager
   */
  async store(options: StoreOptions): Promise<KeychainResult> {
    const { service, account, secret, update } = options;
    const targetName = this.getTargetName(service, account);

    // If update is true, delete existing first
    if (update) {
      await this.delete({ service, account });
    }

    // PowerShell script to add credential
    const script = `
      $ErrorActionPreference = 'Stop'
      try {
        $cred = New-Object System.Management.Automation.PSCredential(
          '${account.replace(/'/g, "''")}',
          (ConvertTo-SecureString '${secret.replace(/'/g, "''")}' -AsPlainText -Force)
        )

        # Use cmdkey for simplicity and reliability
        $targetName = '${targetName.replace(/'/g, "''")}'
        cmdkey /generic:$targetName /user:${account.replace(/'/g, "''")} /pass:${secret.replace(/'/g, "''")} 2>&1 | Out-Null

        if ($LASTEXITCODE -ne 0) {
          throw "cmdkey failed with exit code $LASTEXITCODE"
        }

        Write-Output "OK"
      } catch {
        Write-Error $_.Exception.Message
        exit 1
      }
    `;

    try {
      const proc = Bun.spawn(
        ["powershell.exe", "-NoProfile", "-Command", script],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

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
   * Retrieve a credential from Windows Credential Manager
   */
  async retrieve(options: RetrieveOptions): Promise<KeychainResult<string>> {
    const { service, account } = options;
    const targetName = this.getTargetName(service, account);

    // PowerShell script to retrieve credential
    const script = `
      $ErrorActionPreference = 'Stop'
      try {
        $targetName = '${targetName.replace(/'/g, "''")}'

        # Use cmdkey to list and find our credential
        $output = cmdkey /list:$targetName 2>&1
        if ($LASTEXITCODE -ne 0 -or $output -match 'not found') {
          Write-Error "NOT_FOUND"
          exit 1
        }

        # For actual password retrieval, use .NET
        Add-Type -TypeDefinition @'
          using System;
          using System.Runtime.InteropServices;
          public class CredManager {
            [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
            public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

            [DllImport("advapi32.dll", SetLastError = true)]
            public static extern bool CredFree(IntPtr cred);

            [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
            public struct CREDENTIAL {
              public int Flags;
              public int Type;
              public string TargetName;
              public string Comment;
              public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
              public int CredentialBlobSize;
              public IntPtr CredentialBlob;
              public int Persist;
              public int AttributeCount;
              public IntPtr Attributes;
              public string TargetAlias;
              public string UserName;
            }

            public static string GetPassword(string target) {
              IntPtr credPtr;
              if (!CredRead(target, 1, 0, out credPtr)) return null;
              try {
                CREDENTIAL cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
                return Marshal.PtrToStringUni(cred.CredentialBlob, cred.CredentialBlobSize / 2);
              } finally {
                CredFree(credPtr);
              }
            }
          }
'@
        $password = [CredManager]::GetPassword($targetName)
        if ($null -eq $password) {
          Write-Error "NOT_FOUND"
          exit 1
        }
        Write-Output $password
      } catch {
        Write-Error $_.Exception.Message
        exit 1
      }
    `;

    try {
      const proc = Bun.spawn(
        ["powershell.exe", "-NoProfile", "-Command", script],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      if (exitCode !== 0) {
        if (stderr.includes("NOT_FOUND")) {
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
   * Delete a credential from Windows Credential Manager
   */
  async delete(options: DeleteOptions): Promise<KeychainResult> {
    const { service, account } = options;
    const targetName = this.getTargetName(service, account);

    try {
      const proc = Bun.spawn(
        [
          "cmdkey.exe",
          `/delete:${targetName}`,
        ],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const exitCode = await proc.exited;

      // Exit code 0 = success, anything else we still treat as success
      // since the goal is to ensure the credential doesn't exist
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
    // For specific service+account, use retrieve
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

    // For broader searches, use cmdkey /list
    if (options.service) {
      return this.listByServicePrefix(options.service);
    }

    return { success: true, data: [] };
  }

  /**
   * List credentials by service prefix
   */
  private async listByServicePrefix(
    servicePrefix: string
  ): Promise<KeychainResult<KeychainEntry[]>> {
    try {
      const proc = Bun.spawn(
        ["cmdkey.exe", `/list:${servicePrefix}:*`],
        {
          stdout: "pipe",
          stderr: "pipe",
        }
      );

      const [exitCode, stdout] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
      ]);

      if (exitCode !== 0) {
        return { success: true, data: [] };
      }

      // Parse cmdkey output
      const entries = this.parseCmdkeyOutput(stdout, servicePrefix);
      return { success: true, data: entries };
    } catch {
      return { success: true, data: [] };
    }
  }

  /**
   * Parse cmdkey /list output
   */
  private parseCmdkeyOutput(
    output: string,
    servicePrefix: string
  ): KeychainEntry[] {
    const entries: KeychainEntry[] = [];
    const lines = output.split(/\r?\n/);

    let currentTarget: string | null = null;
    let currentUser: string | null = null;

    for (const line of lines) {
      const targetMatch = line.match(/Target:\s*(.+)/i);
      if (targetMatch) {
        currentTarget = targetMatch[1].trim();
        continue;
      }

      const userMatch = line.match(/User:\s*(.+)/i);
      if (userMatch) {
        currentUser = userMatch[1].trim();

        // Parse target as "service:account"
        if (currentTarget?.startsWith(`${servicePrefix}:`)) {
          const account = currentTarget.slice(servicePrefix.length + 1);
          entries.push({
            service: servicePrefix,
            account,
            secret: "", // cmdkey doesn't show passwords
          });
        }

        currentTarget = null;
        currentUser = null;
      }
    }

    return entries;
  }

  /**
   * List all credentials for a service
   */
  async list(service: string): Promise<KeychainResult<KeychainEntry[]>> {
    return this.listByServicePrefix(service);
  }
}
