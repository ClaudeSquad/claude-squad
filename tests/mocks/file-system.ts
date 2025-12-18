/**
 * File System Mock
 *
 * Mock implementation of file system operations for testing.
 * Simulates file reads, writes, and directory operations.
 */

/**
 * Mock file data
 */
export interface MockFile {
  path: string;
  content: string;
  createdAt: Date;
  modifiedAt: Date;
}

/**
 * File operation record
 */
export interface FileOperation {
  type: "read" | "write" | "delete" | "exists" | "mkdir" | "readdir";
  path: string;
  timestamp: Date;
  content?: string;
}

/**
 * File System Mock
 */
export const mockFileSystem = {
  /** Virtual file system */
  files: new Map<string, MockFile>(),

  /** Operation history */
  operations: [] as FileOperation[],

  /** Directories */
  directories: new Set<string>(),

  /**
   * Reset mock state
   */
  reset(): void {
    this.files.clear();
    this.operations = [];
    this.directories.clear();
    this.directories.add("/");
  },

  /**
   * Record an operation
   */
  recordOperation(type: FileOperation["type"], path: string, content?: string): void {
    this.operations.push({
      type,
      path,
      timestamp: new Date(),
      content,
    });
  },

  /**
   * Write a file to the mock file system
   */
  writeFile(path: string, content: string): void {
    this.recordOperation("write", path, content);

    const now = new Date();
    const existing = this.files.get(path);

    this.files.set(path, {
      path,
      content,
      createdAt: existing?.createdAt ?? now,
      modifiedAt: now,
    });

    // Ensure parent directories exist
    const parts = path.split("/").filter(Boolean);
    let currentPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath += "/" + parts[i];
      this.directories.add(currentPath);
    }
  },

  /**
   * Read a file from the mock file system
   */
  readFile(path: string): string | null {
    this.recordOperation("read", path);
    const file = this.files.get(path);
    return file?.content ?? null;
  },

  /**
   * Delete a file from the mock file system
   */
  deleteFile(path: string): boolean {
    this.recordOperation("delete", path);
    return this.files.delete(path);
  },

  /**
   * Check if a file exists
   */
  exists(path: string): boolean {
    this.recordOperation("exists", path);
    return this.files.has(path) || this.directories.has(path);
  },

  /**
   * Create a directory
   */
  mkdir(path: string): void {
    this.recordOperation("mkdir", path);
    this.directories.add(path);

    // Ensure parent directories exist
    const parts = path.split("/").filter(Boolean);
    let currentPath = "";
    for (const part of parts) {
      currentPath += "/" + part;
      this.directories.add(currentPath);
    }
  },

  /**
   * Read directory contents
   */
  readdir(path: string): string[] {
    this.recordOperation("readdir", path);

    const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;
    const entries = new Set<string>();

    // Find files in directory
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(normalizedPath + "/")) {
        const relativePath = filePath.slice(normalizedPath.length + 1);
        const firstSegment = relativePath.split("/")[0];
        if (firstSegment) {
          entries.add(firstSegment);
        }
      }
    }

    // Find subdirectories
    for (const dir of this.directories) {
      if (dir.startsWith(normalizedPath + "/") && dir !== normalizedPath) {
        const relativePath = dir.slice(normalizedPath.length + 1);
        const firstSegment = relativePath.split("/")[0];
        if (firstSegment) {
          entries.add(firstSegment);
        }
      }
    }

    return Array.from(entries);
  },

  /**
   * Get a file
   */
  getFile(path: string): MockFile | undefined {
    return this.files.get(path);
  },

  /**
   * Get all files
   */
  getAllFiles(): MockFile[] {
    return Array.from(this.files.values());
  },

  /**
   * Get operations of a specific type
   */
  getOperationsByType(type: FileOperation["type"]): FileOperation[] {
    return this.operations.filter((op) => op.type === type);
  },

  /**
   * Check if an operation was performed
   */
  wasOperationPerformed(type: FileOperation["type"], path?: string): boolean {
    return this.operations.some((op) => {
      if (op.type !== type) return false;
      if (path && op.path !== path) return false;
      return true;
    });
  },

  /**
   * Seed the mock file system with multiple files
   */
  seed(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.writeFile(path, content);
    }
  },

  /**
   * Create a mock package.json
   */
  seedPackageJson(path: string, deps: Record<string, string>, devDeps: Record<string, string> = {}): void {
    const content = JSON.stringify(
      {
        name: "test-project",
        version: "1.0.0",
        dependencies: deps,
        devDependencies: devDeps,
      },
      null,
      2
    );
    this.writeFile(`${path}/package.json`, content);
  },
};

export type MockFileSystem = typeof mockFileSystem;
