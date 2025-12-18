/**
 * File System Service
 *
 * Provides file system utilities for reading, writing, and managing
 * files and directories using Bun's native file system APIs.
 */

import { mkdir, readdir, rm, stat, access, watch } from "node:fs/promises";
import { join, dirname, basename, extname, resolve, relative } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

/**
 * File information
 */
export interface FileInfo {
  /** File name */
  name: string;
  /** Full path */
  path: string;
  /** File size in bytes */
  size: number;
  /** Whether it's a directory */
  isDirectory: boolean;
  /** Whether it's a file */
  isFile: boolean;
  /** Whether it's a symbolic link */
  isSymlink: boolean;
  /** Last modified time */
  modifiedAt: Date;
  /** Creation time */
  createdAt: Date;
}

/**
 * Options for reading directories
 */
export interface ReadDirOptions {
  /** Include hidden files (starting with .) */
  includeHidden?: boolean;
  /** Recursively read subdirectories */
  recursive?: boolean;
  /** Filter by file extension(s) */
  extensions?: string[];
  /** Ignore patterns (glob-like) */
  ignore?: string[];
}

/**
 * Options for writing files
 */
export interface WriteOptions {
  /** Create parent directories if they don't exist */
  createDirs?: boolean;
  /** File mode (permissions) */
  mode?: number;
  /** Append instead of overwrite */
  append?: boolean;
}

/**
 * File watch event
 */
export interface WatchEvent {
  /** Event type (change or rename) */
  type: "change" | "rename";
  /** Filename that changed (relative to watched path) */
  filename?: string;
  /** Full path to the changed file */
  path: string;
}

/**
 * Options for file watching
 */
export interface WatchOptions {
  /** Watch subdirectories recursively */
  recursive?: boolean;
  /** Filter by file extensions */
  extensions?: string[];
  /** Debounce events by milliseconds */
  debounceMs?: number;
}

/**
 * File System Service
 *
 * Provides a clean API for common file system operations using
 * Bun's native APIs for optimal performance.
 *
 * @example
 * ```typescript
 * const fs = new FileSystemService();
 *
 * // Read a file
 * const content = await fs.readText('./config.json');
 *
 * // Write a file
 * await fs.writeText('./output.txt', 'Hello, World!', { createDirs: true });
 *
 * // List directory contents
 * const files = await fs.readDir('./src', { recursive: true, extensions: ['.ts'] });
 * ```
 */
export class FileSystemService {
  /**
   * Read a file as text
   *
   * @param path - File path
   * @returns File contents as string
   */
  async readText(path: string): Promise<string> {
    const file = Bun.file(path);
    return file.text();
  }

  /**
   * Read a file as JSON
   *
   * @param path - File path
   * @returns Parsed JSON object
   */
  async readJson<T = unknown>(path: string): Promise<T> {
    const file = Bun.file(path);
    return file.json() as Promise<T>;
  }

  /**
   * Read a file as bytes
   *
   * @param path - File path
   * @returns File contents as Uint8Array
   */
  async readBytes(path: string): Promise<Uint8Array> {
    const file = Bun.file(path);
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  /**
   * Write text to a file
   *
   * @param path - File path
   * @param content - Text content to write
   * @param options - Write options
   */
  async writeText(path: string, content: string, options?: WriteOptions): Promise<void> {
    if (options?.createDirs) {
      await this.ensureDir(dirname(path));
    }

    if (options?.append) {
      const existing = await this.exists(path) ? await this.readText(path) : "";
      content = existing + content;
    }

    await Bun.write(path, content);
  }

  /**
   * Write JSON to a file
   *
   * @param path - File path
   * @param data - Data to serialize as JSON
   * @param options - Write options
   * @param pretty - Pretty print JSON (default: true)
   */
  async writeJson(
    path: string,
    data: unknown,
    options?: WriteOptions,
    pretty = true
  ): Promise<void> {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await this.writeText(path, content, options);
  }

  /**
   * Write bytes to a file
   *
   * @param path - File path
   * @param content - Binary content
   * @param options - Write options
   */
  async writeBytes(
    path: string,
    content: Uint8Array | ArrayBuffer,
    options?: WriteOptions
  ): Promise<void> {
    if (options?.createDirs) {
      await this.ensureDir(dirname(path));
    }

    await Bun.write(path, content);
  }

  /**
   * Check if a file or directory exists
   *
   * @param path - Path to check
   * @returns True if exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file information
   *
   * @param path - File path
   * @returns File information
   */
  async getInfo(path: string): Promise<FileInfo> {
    const stats = await stat(path);
    return {
      name: basename(path),
      path: resolve(path),
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymlink: stats.isSymbolicLink(),
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  }

  /**
   * Read directory contents
   *
   * @param path - Directory path
   * @param options - Read options
   * @returns Array of file information
   */
  async readDir(path: string, options?: ReadDirOptions): Promise<FileInfo[]> {
    const results: FileInfo[] = [];
    const entries = await readdir(path, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files unless requested
      if (!options?.includeHidden && entry.name.startsWith(".")) {
        continue;
      }

      // Check ignore patterns
      if (options?.ignore?.some((pattern) => this.matchPattern(entry.name, pattern))) {
        continue;
      }

      const fullPath = join(path, entry.name);

      if (entry.isDirectory()) {
        results.push({
          name: entry.name,
          path: resolve(fullPath),
          size: 0,
          isDirectory: true,
          isFile: false,
          isSymlink: entry.isSymbolicLink(),
          modifiedAt: new Date(),
          createdAt: new Date(),
        });

        // Recurse into subdirectories
        if (options?.recursive) {
          const subResults = await this.readDir(fullPath, options);
          results.push(...subResults);
        }
      } else if (entry.isFile()) {
        // Filter by extension
        if (options?.extensions) {
          const ext = extname(entry.name);
          if (!options.extensions.includes(ext)) {
            continue;
          }
        }

        const stats = await stat(fullPath);
        results.push({
          name: entry.name,
          path: resolve(fullPath),
          size: stats.size,
          isDirectory: false,
          isFile: true,
          isSymlink: entry.isSymbolicLink(),
          modifiedAt: stats.mtime,
          createdAt: stats.birthtime,
        });
      }
    }

    return results;
  }

  /**
   * Create a directory (and parent directories if needed)
   *
   * @param path - Directory path
   */
  async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  /**
   * Remove a file or directory
   *
   * @param path - Path to remove
   * @param recursive - Remove directories recursively
   */
  async remove(path: string, recursive = false): Promise<void> {
    await rm(path, { recursive, force: true });
  }

  /**
   * Copy a file
   *
   * @param src - Source path
   * @param dest - Destination path
   * @param createDirs - Create destination directories
   */
  async copy(src: string, dest: string, createDirs = true): Promise<void> {
    if (createDirs) {
      await this.ensureDir(dirname(dest));
    }

    const content = await this.readBytes(src);
    await this.writeBytes(dest, content);
  }

  /**
   * Move/rename a file
   *
   * @param src - Source path
   * @param dest - Destination path
   * @param createDirs - Create destination directories
   */
  async move(src: string, dest: string, createDirs = true): Promise<void> {
    await this.copy(src, dest, createDirs);
    await this.remove(src);
  }

  /**
   * Get file size in human-readable format
   *
   * @param bytes - Size in bytes
   * @returns Human-readable size string
   */
  formatSize(bytes: number): string {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  /**
   * Get relative path from one path to another
   *
   * @param from - Starting path
   * @param to - Target path
   * @returns Relative path
   */
  relativePath(from: string, to: string): string {
    return relative(from, to);
  }

  /**
   * Join path segments
   *
   * @param segments - Path segments to join
   * @returns Joined path
   */
  joinPath(...segments: string[]): string {
    return join(...segments);
  }

  /**
   * Resolve path to absolute
   *
   * @param path - Path to resolve
   * @returns Absolute path
   */
  resolvePath(path: string): string {
    return resolve(path);
  }

  /**
   * Get the directory name from a path
   *
   * @param path - File path
   * @returns Directory path
   */
  getDirname(path: string): string {
    return dirname(path);
  }

  /**
   * Get the file name from a path
   *
   * @param path - File path
   * @param includeExt - Include extension (default: true)
   * @returns File name
   */
  getBasename(path: string, includeExt = true): string {
    const name = basename(path);
    if (includeExt) return name;
    return name.replace(extname(name), "");
  }

  /**
   * Get the file extension
   *
   * @param path - File path
   * @returns File extension (including dot)
   */
  getExtension(path: string): string {
    return extname(path);
  }

  // ==========================================================================
  // YAML Operations
  // ==========================================================================

  /**
   * Read a file as YAML
   *
   * @param path - File path
   * @returns Parsed YAML object
   */
  async readYaml<T = unknown>(path: string): Promise<T> {
    const content = await this.readText(path);
    return parseYaml(content) as T;
  }

  /**
   * Write YAML to a file
   *
   * @param path - File path
   * @param data - Data to serialize as YAML
   * @param options - Write options
   */
  async writeYaml(
    path: string,
    data: unknown,
    options?: WriteOptions
  ): Promise<void> {
    const content = stringifyYaml(data, {
      indent: 2,
      lineWidth: 120,
    });
    await this.writeText(path, content, options);
  }

  /**
   * Parse YAML frontmatter from a file (like skill markdown files)
   *
   * @param path - File path
   * @returns Object with frontmatter and content
   */
  async readYamlFrontmatter<T = Record<string, unknown>>(
    path: string
  ): Promise<{ frontmatter: T; content: string }> {
    const text = await this.readText(path);
    return this.parseYamlFrontmatter<T>(text);
  }

  /**
   * Parse YAML frontmatter from text
   *
   * @param text - Text with YAML frontmatter
   * @returns Object with frontmatter and content
   */
  parseYamlFrontmatter<T = Record<string, unknown>>(
    text: string
  ): { frontmatter: T; content: string } {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
    const match = text.match(frontmatterRegex);

    if (!match) {
      return {
        frontmatter: {} as T,
        content: text,
      };
    }

    const frontmatter = parseYaml(match[1] ?? "") as T;
    const content = match[2]?.trim() ?? "";

    return { frontmatter, content };
  }

  /**
   * Write a file with YAML frontmatter
   *
   * @param path - File path
   * @param frontmatter - Frontmatter object
   * @param content - Content after frontmatter
   * @param options - Write options
   */
  async writeYamlFrontmatter(
    path: string,
    frontmatter: Record<string, unknown>,
    content: string,
    options?: WriteOptions
  ): Promise<void> {
    const yamlContent = stringifyYaml(frontmatter, { indent: 2 });
    const fullContent = `---\n${yamlContent}---\n\n${content}`;
    await this.writeText(path, fullContent, options);
  }

  // ==========================================================================
  // File Watching
  // ==========================================================================

  /**
   * Watch a file or directory for changes
   *
   * Uses Bun's native file watching for optimal performance.
   *
   * @param path - Path to watch (file or directory)
   * @param callback - Callback when changes occur
   * @param options - Watch options
   * @returns AbortController to stop watching
   *
   * @example
   * ```typescript
   * const controller = await fs.watch('./config', (event) => {
   *   console.log(`${event.type} on ${event.path}`);
   * });
   *
   * // Later, stop watching
   * controller.abort();
   * ```
   */
  async watchPath(
    path: string,
    callback: (event: WatchEvent) => void,
    options?: WatchOptions
  ): Promise<AbortController> {
    const controller = new AbortController();

    const watcher = watch(path, {
      recursive: options?.recursive ?? true,
      signal: controller.signal,
    });

    // Process events asynchronously
    (async () => {
      try {
        for await (const event of watcher) {
          // Handle debouncing
          if (options?.debounceMs) {
            // Simple debounce by checking last event time
            const now = Date.now();
            if (
              this.lastWatchEvent &&
              now - this.lastWatchEvent < options.debounceMs
            ) {
              continue;
            }
            this.lastWatchEvent = now;
          }

          // Filter by extension if specified
          if (options?.extensions && event.filename) {
            const ext = extname(event.filename);
            if (!options.extensions.includes(ext)) {
              continue;
            }
          }

          const watchEvent: WatchEvent = {
            type: event.eventType as "rename" | "change",
            filename: event.filename ?? undefined,
            path: event.filename ? join(path, event.filename) : path,
          };

          callback(watchEvent);
        }
      } catch (error) {
        // AbortError is expected when controller.abort() is called
        if ((error as Error).name !== "AbortError") {
          console.error("Watch error:", error);
        }
      }
    })();

    return controller;
  }

  /**
   * Watch multiple paths for changes
   *
   * @param paths - Array of paths to watch
   * @param callback - Callback when changes occur
   * @param options - Watch options
   * @returns AbortController to stop all watchers
   */
  async watchPaths(
    paths: string[],
    callback: (event: WatchEvent) => void,
    options?: WatchOptions
  ): Promise<AbortController> {
    const mainController = new AbortController();
    const controllers: AbortController[] = [];

    for (const path of paths) {
      const controller = await this.watchPath(path, callback, options);
      controllers.push(controller);
    }

    // When main controller aborts, abort all sub-controllers
    mainController.signal.addEventListener("abort", () => {
      for (const controller of controllers) {
        controller.abort();
      }
    });

    return mainController;
  }

  /**
   * Watch for YAML file changes in a directory
   *
   * Convenience method for watching skill/workflow/agent YAML files.
   *
   * @param dir - Directory to watch
   * @param callback - Callback when YAML files change
   * @returns AbortController to stop watching
   */
  async watchYamlFiles(
    dir: string,
    callback: (event: WatchEvent) => void
  ): Promise<AbortController> {
    return this.watchPath(dir, callback, {
      recursive: true,
      extensions: [".yaml", ".yml"],
      debounceMs: 100,
    });
  }

  /**
   * Watch for Markdown files (skills) in a directory
   *
   * @param dir - Directory to watch
   * @param callback - Callback when MD files change
   * @returns AbortController to stop watching
   */
  async watchMarkdownFiles(
    dir: string,
    callback: (event: WatchEvent) => void
  ): Promise<AbortController> {
    return this.watchPath(dir, callback, {
      recursive: true,
      extensions: [".md"],
      debounceMs: 100,
    });
  }

  // Track last watch event for debouncing
  private lastWatchEvent?: number;

  /**
   * Simple pattern matching (supports * wildcard)
   */
  private matchPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return regex.test(name);
  }
}

/**
 * Create a file system service instance
 */
export function createFileSystemService(): FileSystemService {
  return new FileSystemService();
}

/**
 * Global file system service instance
 */
export const fs = new FileSystemService();
