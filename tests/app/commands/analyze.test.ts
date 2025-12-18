/**
 * Analyze Command Tests
 *
 * Tests for project analysis and recommendation generation.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { detectProjectType } from "../../../src/app/commands/analyze.js";

describe("detectProjectType", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = `/tmp/squad-analyze-test-${Date.now()}`;
    await Bun.write(join(testDir, ".gitkeep"), "");
  });

  afterEach(async () => {
    try {
      const proc = Bun.spawn(["rm", "-rf", testDir]);
      await proc.exited;
    } catch {
      // Ignore
    }
  });

  test("should detect Next.js project", async () => {
    const packageJson = {
      name: "test-nextjs",
      dependencies: {
        next: "14.0.0",
        react: "18.0.0",
        "react-dom": "18.0.0",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.frameworks).toContain("Next.js");
    expect(result.projectType).toBe("Full-stack Web Application");
    expect(result.languages).toContain("TypeScript/JavaScript");
  });

  test("should detect React project", async () => {
    const packageJson = {
      name: "test-react",
      dependencies: {
        react: "18.0.0",
        "react-dom": "18.0.0",
      },
      devDependencies: {
        vite: "5.0.0",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.frameworks).toContain("React");
    expect(result.buildTools).toContain("Vite");
    expect(result.projectType).toBe("Frontend Application");
  });

  test("should detect Hono backend project", async () => {
    const packageJson = {
      name: "test-hono",
      dependencies: {
        hono: "4.0.0",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.frameworks).toContain("Hono");
    expect(result.projectType).toBe("Backend/API");
  });

  test("should detect Express backend project", async () => {
    const packageJson = {
      name: "test-express",
      dependencies: {
        express: "4.18.0",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.frameworks).toContain("Express");
    expect(result.projectType).toBe("Backend/API");
  });

  test("should detect Bun as package manager", async () => {
    const packageJson = { name: "test-bun" };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));
    await Bun.write(join(testDir, "bun.lockb"), "");

    const result = await detectProjectType(testDir);

    expect(result.packageManager).toBe("bun");
    expect(result.buildTools).toContain("Bun");
  });

  test("should detect npm as package manager", async () => {
    const packageJson = { name: "test-npm" };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));
    await Bun.write(join(testDir, "package-lock.json"), "{}");

    const result = await detectProjectType(testDir);

    expect(result.packageManager).toBe("npm");
  });

  test("should detect testing setup", async () => {
    const packageJson = {
      name: "test-with-tests",
      devDependencies: {
        vitest: "1.0.0",
        "@testing-library/react": "14.0.0",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.hasTests).toBe(true);
  });

  test("should detect Docker setup", async () => {
    await Bun.write(join(testDir, "Dockerfile"), "FROM node:20");

    const result = await detectProjectType(testDir);

    expect(result.hasDocker).toBe(true);
  });

  test("should detect CI setup", async () => {
    await Bun.write(join(testDir, ".github/workflows/ci.yml"), "name: CI");

    const result = await detectProjectType(testDir);

    expect(result.hasCI).toBe(true);
  });

  test("should detect Go project", async () => {
    await Bun.write(join(testDir, "go.mod"), "module test\n\ngo 1.21");

    const result = await detectProjectType(testDir);

    expect(result.languages).toContain("Go");
  });

  test("should detect Rust project", async () => {
    await Bun.write(join(testDir, "Cargo.toml"), '[package]\nname = "test"');

    const result = await detectProjectType(testDir);

    expect(result.languages).toContain("Rust");
  });

  test("should detect Python project", async () => {
    await Bun.write(join(testDir, "requirements.txt"), "flask==2.0.0");

    const result = await detectProjectType(testDir);

    expect(result.languages).toContain("Python");
  });

  test("should detect React Native project", async () => {
    const packageJson = {
      name: "test-mobile",
      dependencies: {
        "react-native": "0.72.0",
        react: "18.0.0",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.frameworks).toContain("React Native");
    expect(result.projectType).toBe("Mobile Application");
  });

  test("should detect CLI tool project", async () => {
    const packageJson = {
      name: "test-cli",
      bin: {
        mycli: "./bin/cli.js",
      },
    };
    await Bun.write(join(testDir, "package.json"), JSON.stringify(packageJson));

    const result = await detectProjectType(testDir);

    expect(result.projectType).toBe("CLI Tool");
  });

  test("should handle missing package.json", async () => {
    const result = await detectProjectType(testDir);

    expect(result.projectType).toBe("unknown");
    expect(result.frameworks).toEqual([]);
  });
});
