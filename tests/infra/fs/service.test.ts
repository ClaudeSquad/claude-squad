/**
 * File System Service Tests
 *
 * Tests for file system operations using Bun's native APIs.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FileSystemService, createFileSystemService, fs } from "../../../src/infra/fs/service.js";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

describe("FileSystemService", () => {
  let service: FileSystemService;
  const testDir = "/tmp/fs-service-test";

  beforeEach(async () => {
    service = new FileSystemService();
    // Create test directory
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("readText", () => {
    it("should read text file contents", async () => {
      const testFile = join(testDir, "test.txt");
      await writeFile(testFile, "Hello, World!");

      const content = await service.readText(testFile);

      expect(content).toBe("Hello, World!");
    });

    it("should handle UTF-8 content", async () => {
      const testFile = join(testDir, "unicode.txt");
      await writeFile(testFile, "Hello 世界 🌍");

      const content = await service.readText(testFile);

      expect(content).toBe("Hello 世界 🌍");
    });
  });

  describe("readJson", () => {
    it("should read and parse JSON file", async () => {
      const testFile = join(testDir, "data.json");
      await writeFile(testFile, JSON.stringify({ name: "test", value: 42 }));

      interface TestData {
        name: string;
        value: number;
      }

      const data = await service.readJson<TestData>(testFile);

      expect(data.name).toBe("test");
      expect(data.value).toBe(42);
    });

    it("should handle nested JSON structures", async () => {
      const testFile = join(testDir, "nested.json");
      const nested = {
        level1: {
          level2: {
            value: "deep",
          },
        },
      };
      await writeFile(testFile, JSON.stringify(nested));

      const data = await service.readJson<typeof nested>(testFile);

      expect(data.level1.level2.value).toBe("deep");
    });
  });

  describe("writeText", () => {
    it("should write text to file", async () => {
      const testFile = join(testDir, "output.txt");

      await service.writeText(testFile, "Written content");

      const content = await Bun.file(testFile).text();
      expect(content).toBe("Written content");
    });

    it("should create parent directories when specified", async () => {
      const testFile = join(testDir, "deep/nested/file.txt");

      await service.writeText(testFile, "Nested content", { createDirs: true });

      const content = await Bun.file(testFile).text();
      expect(content).toBe("Nested content");
    });

    it("should append to existing file when specified", async () => {
      const testFile = join(testDir, "append.txt");
      await writeFile(testFile, "First line\n");

      await service.writeText(testFile, "Second line", { append: true });

      const content = await Bun.file(testFile).text();
      expect(content).toBe("First line\nSecond line");
    });
  });

  describe("writeJson", () => {
    it("should write JSON with pretty formatting by default", async () => {
      const testFile = join(testDir, "pretty.json");

      await service.writeJson(testFile, { name: "test" });

      const content = await Bun.file(testFile).text();
      expect(content).toContain("\n"); // Pretty printed has newlines
      expect(JSON.parse(content)).toEqual({ name: "test" });
    });

    it("should write compact JSON when specified", async () => {
      const testFile = join(testDir, "compact.json");

      await service.writeJson(testFile, { name: "test" }, undefined, false);

      const content = await Bun.file(testFile).text();
      expect(content).toBe('{"name":"test"}');
    });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      const testFile = join(testDir, "exists.txt");
      await writeFile(testFile, "");

      expect(await service.exists(testFile)).toBe(true);
    });

    it("should return true for existing directory", async () => {
      expect(await service.exists(testDir)).toBe(true);
    });

    it("should return false for non-existent path", async () => {
      expect(await service.exists(join(testDir, "nope.txt"))).toBe(false);
    });
  });

  describe("getInfo", () => {
    it("should return file information", async () => {
      const testFile = join(testDir, "info.txt");
      await writeFile(testFile, "Content here");

      const info = await service.getInfo(testFile);

      expect(info.name).toBe("info.txt");
      expect(info.isFile).toBe(true);
      expect(info.isDirectory).toBe(false);
      expect(info.size).toBeGreaterThan(0);
      expect(info.modifiedAt).toBeInstanceOf(Date);
    });

    it("should return directory information", async () => {
      const info = await service.getInfo(testDir);

      expect(info.isDirectory).toBe(true);
      expect(info.isFile).toBe(false);
    });
  });

  describe("readDir", () => {
    beforeEach(async () => {
      // Setup test files
      await writeFile(join(testDir, "file1.txt"), "content1");
      await writeFile(join(testDir, "file2.ts"), "content2");
      await writeFile(join(testDir, ".hidden"), "hidden");
      await mkdir(join(testDir, "subdir"));
      await writeFile(join(testDir, "subdir/nested.txt"), "nested");
    });

    it("should list directory contents", async () => {
      const files = await service.readDir(testDir);

      const names = files.map((f) => f.name);
      expect(names).toContain("file1.txt");
      expect(names).toContain("file2.ts");
      expect(names).toContain("subdir");
    });

    it("should exclude hidden files by default", async () => {
      const files = await service.readDir(testDir);

      const names = files.map((f) => f.name);
      expect(names).not.toContain(".hidden");
    });

    it("should include hidden files when specified", async () => {
      const files = await service.readDir(testDir, { includeHidden: true });

      const names = files.map((f) => f.name);
      expect(names).toContain(".hidden");
    });

    it("should filter by extension", async () => {
      const files = await service.readDir(testDir, { extensions: [".txt"] });

      const names = files.map((f) => f.name);
      expect(names).toContain("file1.txt");
      expect(names).not.toContain("file2.ts");
    });

    it("should read recursively when specified", async () => {
      const files = await service.readDir(testDir, { recursive: true });

      const names = files.map((f) => f.name);
      expect(names).toContain("nested.txt");
    });

    it("should apply ignore patterns", async () => {
      const files = await service.readDir(testDir, { ignore: ["*.ts"] });

      const names = files.map((f) => f.name);
      expect(names).not.toContain("file2.ts");
    });
  });

  describe("ensureDir", () => {
    it("should create directory", async () => {
      const newDir = join(testDir, "new-dir");

      await service.ensureDir(newDir);

      expect(await service.exists(newDir)).toBe(true);
    });

    it("should create nested directories", async () => {
      const deepDir = join(testDir, "a/b/c/d");

      await service.ensureDir(deepDir);

      expect(await service.exists(deepDir)).toBe(true);
    });

    it("should not error on existing directory", async () => {
      await expect(service.ensureDir(testDir)).resolves.toBeUndefined();
    });
  });

  describe("remove", () => {
    it("should remove file", async () => {
      const testFile = join(testDir, "to-remove.txt");
      await writeFile(testFile, "bye");

      await service.remove(testFile);

      expect(await service.exists(testFile)).toBe(false);
    });

    it("should remove directory recursively", async () => {
      const subDir = join(testDir, "sub-to-remove");
      await mkdir(subDir);
      await writeFile(join(subDir, "file.txt"), "content");

      await service.remove(subDir, true);

      expect(await service.exists(subDir)).toBe(false);
    });
  });

  describe("copy", () => {
    it("should copy file", async () => {
      const src = join(testDir, "source.txt");
      const dest = join(testDir, "copied.txt");
      await writeFile(src, "Copy me");

      await service.copy(src, dest);

      const content = await Bun.file(dest).text();
      expect(content).toBe("Copy me");
    });

    it("should create destination directories", async () => {
      const src = join(testDir, "to-copy.txt");
      const dest = join(testDir, "new/path/copied.txt");
      await writeFile(src, "Content");

      await service.copy(src, dest);

      expect(await service.exists(dest)).toBe(true);
    });
  });

  describe("move", () => {
    it("should move file", async () => {
      const src = join(testDir, "original.txt");
      const dest = join(testDir, "moved.txt");
      await writeFile(src, "Move me");

      await service.move(src, dest);

      expect(await service.exists(src)).toBe(false);
      expect(await service.exists(dest)).toBe(true);

      const content = await Bun.file(dest).text();
      expect(content).toBe("Move me");
    });
  });

  describe("formatSize", () => {
    it("should format bytes", () => {
      expect(service.formatSize(0)).toBe("0 B");
      expect(service.formatSize(100)).toBe("100 B");
    });

    it("should format kilobytes", () => {
      expect(service.formatSize(1024)).toBe("1.0 KB");
      expect(service.formatSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(service.formatSize(1024 * 1024)).toBe("1.0 MB");
    });

    it("should format gigabytes", () => {
      expect(service.formatSize(1024 * 1024 * 1024)).toBe("1.0 GB");
    });
  });

  describe("path utilities", () => {
    it("should join paths", () => {
      expect(service.joinPath("/a", "b", "c")).toBe("/a/b/c");
    });

    it("should resolve absolute path", () => {
      const resolved = service.resolvePath("./relative");
      expect(resolved.startsWith("/")).toBe(true);
    });

    it("should get directory name", () => {
      expect(service.getDirname("/path/to/file.txt")).toBe("/path/to");
    });

    it("should get base name with extension", () => {
      expect(service.getBasename("/path/to/file.txt")).toBe("file.txt");
    });

    it("should get base name without extension", () => {
      expect(service.getBasename("/path/to/file.txt", false)).toBe("file");
    });

    it("should get extension", () => {
      expect(service.getExtension("/path/to/file.txt")).toBe(".txt");
    });

    it("should get relative path", () => {
      expect(service.relativePath("/a/b", "/a/b/c/d")).toBe("c/d");
    });
  });

  describe("createFileSystemService factory", () => {
    it("should create new instance", () => {
      const instance = createFileSystemService();
      expect(instance).toBeInstanceOf(FileSystemService);
    });
  });

  describe("global fs instance", () => {
    it("should be a FileSystemService instance", () => {
      expect(fs).toBeInstanceOf(FileSystemService);
    });
  });
});
