/**
 * Analyze Command
 *
 * Performs capability gap analysis on the current project.
 * Scans the project directory to:
 *   - Detect project type and technology stack
 *   - Recommend appropriate agents
 *   - Identify missing skills
 *   - Suggest workflows
 */

import { join } from "path";

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
} as const;

/**
 * Project detection result
 */
export interface ProjectDetection {
  projectType: string;
  frameworks: string[];
  languages: string[];
  buildTools: string[];
  packageManager: string;
  hasTests: boolean;
  hasDocker: boolean;
  hasCI: boolean;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  detection: ProjectDetection;
  recommendedAgents: AgentRecommendation[];
  missingSkills: SkillRecommendation[];
  suggestedWorkflows: WorkflowRecommendation[];
}

/**
 * Agent recommendation
 */
export interface AgentRecommendation {
  role: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

/**
 * Skill recommendation
 */
export interface SkillRecommendation {
  name: string;
  description: string;
  forFramework: string;
}

/**
 * Workflow recommendation
 */
export interface WorkflowRecommendation {
  name: string;
  description: string;
  suitableFor: string;
}

/**
 * File existence checker
 */
async function fileExists(path: string): Promise<boolean> {
  const file = Bun.file(path);
  return file.exists();
}

/**
 * Directory existence checker
 */
async function dirExists(path: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["test", "-d", path]);
    const exitCode = await proc.exited;
    return exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Read JSON file safely
 */
async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return null;
    const content = await file.text();
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Detect project type and technology stack
 */
export async function detectProjectType(projectPath: string): Promise<ProjectDetection> {
  const detection: ProjectDetection = {
    projectType: "unknown",
    frameworks: [],
    languages: [],
    buildTools: [],
    packageManager: "unknown",
    hasTests: false,
    hasDocker: false,
    hasCI: false,
  };

  // Check package.json for dependencies
  const packageJson = await readJsonFile(join(projectPath, "package.json"));
  if (packageJson) {
    const deps = {
      ...(packageJson.dependencies as Record<string, string> | undefined),
      ...(packageJson.devDependencies as Record<string, string> | undefined),
    };

    detection.languages.push("TypeScript/JavaScript");

    // Detect frameworks
    if (deps.next) detection.frameworks.push("Next.js");
    if (deps.react && !deps.next) detection.frameworks.push("React");
    if (deps.vue) detection.frameworks.push("Vue");
    if (deps.svelte || deps["@sveltejs/kit"]) detection.frameworks.push("Svelte");
    if (deps.astro) detection.frameworks.push("Astro");
    if (deps.express) detection.frameworks.push("Express");
    if (deps.fastify) detection.frameworks.push("Fastify");
    if (deps.hono) detection.frameworks.push("Hono");
    if (deps.elysia) detection.frameworks.push("Elysia");
    if (deps.nest || deps["@nestjs/core"]) detection.frameworks.push("NestJS");
    if (deps["react-native"] || deps.expo) detection.frameworks.push("React Native");

    // Detect build tools
    if (deps.vite) detection.buildTools.push("Vite");
    if (deps.webpack) detection.buildTools.push("Webpack");
    if (deps.esbuild) detection.buildTools.push("esbuild");
    if (deps.turbo) detection.buildTools.push("Turborepo");
    if (deps.rollup) detection.buildTools.push("Rollup");

    // Detect testing
    if (deps.jest || deps.vitest || deps["@testing-library/react"]) {
      detection.hasTests = true;
    }
  }

  // Check for Bun
  if (await fileExists(join(projectPath, "bun.lockb"))) {
    detection.packageManager = "bun";
    detection.buildTools.push("Bun");
  } else if (await fileExists(join(projectPath, "pnpm-lock.yaml"))) {
    detection.packageManager = "pnpm";
  } else if (await fileExists(join(projectPath, "yarn.lock"))) {
    detection.packageManager = "yarn";
  } else if (await fileExists(join(projectPath, "package-lock.json"))) {
    detection.packageManager = "npm";
  }

  // Check for other languages
  if (await fileExists(join(projectPath, "go.mod"))) {
    detection.languages.push("Go");
  }
  if (await fileExists(join(projectPath, "Cargo.toml"))) {
    detection.languages.push("Rust");
  }
  if (await fileExists(join(projectPath, "requirements.txt")) || await fileExists(join(projectPath, "pyproject.toml"))) {
    detection.languages.push("Python");
  }
  if (await fileExists(join(projectPath, "pom.xml")) || await fileExists(join(projectPath, "build.gradle"))) {
    detection.languages.push("Java");
  }

  // Check for Docker
  if (await fileExists(join(projectPath, "Dockerfile")) || await fileExists(join(projectPath, "docker-compose.yml"))) {
    detection.hasDocker = true;
  }

  // Check for CI (workflows is a directory, others are files)
  if (
    await dirExists(join(projectPath, ".github/workflows")) ||
    await fileExists(join(projectPath, ".gitlab-ci.yml")) ||
    await fileExists(join(projectPath, ".circleci/config.yml"))
  ) {
    detection.hasCI = true;
  }

  // Determine project type (order matters - check mobile before frontend since React Native includes React)
  if (detection.frameworks.includes("React Native")) {
    detection.projectType = "Mobile Application";
  } else if (detection.frameworks.some((f) => ["Next.js", "Nuxt", "Remix", "SvelteKit"].includes(f))) {
    detection.projectType = "Full-stack Web Application";
  } else if (detection.frameworks.some((f) => ["React", "Vue", "Svelte", "Astro"].includes(f))) {
    detection.projectType = "Frontend Application";
  } else if (detection.frameworks.some((f) => ["Express", "Fastify", "Hono", "NestJS", "Elysia"].includes(f))) {
    detection.projectType = "Backend/API";
  } else if (packageJson?.bin) {
    detection.projectType = "CLI Tool";
  } else if (packageJson) {
    detection.projectType = "Node.js Project";
  }

  return detection;
}

/**
 * Generate agent recommendations based on detection
 */
function generateAgentRecommendations(detection: ProjectDetection): AgentRecommendation[] {
  const recommendations: AgentRecommendation[] = [];

  // Always recommend architect
  recommendations.push({
    role: "architect",
    reason: "Plan and design system architecture",
    priority: "high",
  });

  // Frontend-specific agents
  if (
    detection.projectType.includes("Frontend") ||
    detection.projectType.includes("Full-stack") ||
    detection.frameworks.some((f) => ["React", "Vue", "Svelte", "Next.js"].includes(f))
  ) {
    recommendations.push({
      role: "frontend-engineer",
      reason: `Build UI components with ${detection.frameworks.filter((f) => ["React", "Vue", "Svelte", "Next.js"].includes(f)).join(", ") || "frontend framework"}`,
      priority: "high",
    });

    recommendations.push({
      role: "ui-designer",
      reason: "Design user interfaces and ensure good UX",
      priority: "medium",
    });
  }

  // Backend-specific agents
  if (
    detection.projectType.includes("Backend") ||
    detection.projectType.includes("Full-stack") ||
    detection.frameworks.some((f) => ["Express", "Fastify", "Hono", "NestJS", "Elysia"].includes(f))
  ) {
    recommendations.push({
      role: "backend-engineer",
      reason: `Build APIs and services with ${detection.frameworks.filter((f) => ["Express", "Fastify", "Hono", "NestJS", "Elysia"].includes(f)).join(", ") || "backend framework"}`,
      priority: "high",
    });

    recommendations.push({
      role: "database-engineer",
      reason: "Design and optimize database schemas",
      priority: "medium",
    });
  }

  // Mobile-specific agents
  if (detection.projectType.includes("Mobile") || detection.frameworks.includes("React Native")) {
    recommendations.push({
      role: "mobile-engineer",
      reason: "Build native mobile experiences with React Native",
      priority: "high",
    });
  }

  // Testing
  if (detection.hasTests) {
    recommendations.push({
      role: "qa-engineer",
      reason: "Write and maintain tests",
      priority: "high",
    });
  } else {
    recommendations.push({
      role: "qa-engineer",
      reason: "Set up testing infrastructure",
      priority: "medium",
    });
  }

  // DevOps
  if (detection.hasDocker || detection.hasCI) {
    recommendations.push({
      role: "devops-engineer",
      reason: "Manage CI/CD and infrastructure",
      priority: "medium",
    });
  }

  // Security (always good to have)
  recommendations.push({
    role: "security-engineer",
    reason: "Review code for security vulnerabilities",
    priority: "low",
  });

  return recommendations;
}

/**
 * Generate skill recommendations based on detection
 */
function generateSkillRecommendations(detection: ProjectDetection): SkillRecommendation[] {
  const skills: SkillRecommendation[] = [];

  // Framework-specific skills
  if (detection.frameworks.includes("Next.js")) {
    skills.push({
      name: "nextjs-patterns",
      description: "Next.js App Router, Server Components, and best practices",
      forFramework: "Next.js",
    });
  }

  if (detection.frameworks.includes("React")) {
    skills.push({
      name: "react-patterns",
      description: "React hooks, state management, and component patterns",
      forFramework: "React",
    });
  }

  if (detection.frameworks.includes("Hono")) {
    skills.push({
      name: "hono-patterns",
      description: "Hono middleware, routing, and edge deployment",
      forFramework: "Hono",
    });
  }

  if (detection.buildTools.includes("Bun")) {
    skills.push({
      name: "bun-runtime",
      description: "Bun APIs, SQLite, file system, and process spawning",
      forFramework: "Bun",
    });
  }

  // Language-specific skills
  if (detection.languages.includes("TypeScript/JavaScript")) {
    skills.push({
      name: "typescript-patterns",
      description: "Advanced TypeScript types, generics, and best practices",
      forFramework: "TypeScript",
    });
  }

  // Testing skills
  if (detection.hasTests) {
    skills.push({
      name: "testing-patterns",
      description: "Unit testing, integration testing, and mocking strategies",
      forFramework: "Testing",
    });
  }

  return skills;
}

/**
 * Generate workflow recommendations based on detection
 */
function generateWorkflowRecommendations(detection: ProjectDetection): WorkflowRecommendation[] {
  const workflows: WorkflowRecommendation[] = [];

  // Standard feature workflow
  workflows.push({
    name: "feature",
    description: "Full feature development with planning, implementation, and review",
    suitableFor: "New feature development",
  });

  // Bug fix workflow
  workflows.push({
    name: "bugfix",
    description: "Quick bug fix workflow with minimal overhead",
    suitableFor: "Bug fixes and patches",
  });

  // Full-stack specific
  if (detection.projectType.includes("Full-stack")) {
    workflows.push({
      name: "web-app-sdlc",
      description: "Complete SDLC with frontend, backend, and integration stages",
      suitableFor: "Complex full-stack features",
    });
  }

  // Refactoring workflow
  workflows.push({
    name: "refactor",
    description: "Code refactoring with safety checks and testing",
    suitableFor: "Code improvements and technical debt",
  });

  return workflows;
}

/**
 * Display analysis results
 */
function displayResults(result: AnalysisResult, asJson: boolean): void {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const { detection, recommendedAgents, missingSkills, suggestedWorkflows } = result;

  // Banner
  console.log(`
${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.cyan}${colors.bold}              Claude Squad - Project Analysis${colors.reset}
${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);

  // Project Detection
  console.log(`${colors.bold}Project Detection${colors.reset}`);
  console.log(`${colors.dim}─────────────────${colors.reset}`);
  console.log(`  Type: ${colors.cyan}${detection.projectType}${colors.reset}`);

  if (detection.frameworks.length > 0) {
    console.log(`  Frameworks: ${colors.cyan}${detection.frameworks.join(", ")}${colors.reset}`);
  }
  if (detection.languages.length > 0) {
    console.log(`  Languages: ${colors.cyan}${detection.languages.join(", ")}${colors.reset}`);
  }
  if (detection.buildTools.length > 0) {
    console.log(`  Build Tools: ${colors.cyan}${detection.buildTools.join(", ")}${colors.reset}`);
  }
  console.log(`  Package Manager: ${colors.cyan}${detection.packageManager}${colors.reset}`);
  console.log(`  Has Tests: ${detection.hasTests ? colors.green + "Yes" : colors.yellow + "No"}${colors.reset}`);
  console.log(`  Has Docker: ${detection.hasDocker ? colors.green + "Yes" : colors.dim + "No"}${colors.reset}`);
  console.log(`  Has CI: ${detection.hasCI ? colors.green + "Yes" : colors.dim + "No"}${colors.reset}`);

  // Recommended Agents
  console.log(`\n${colors.bold}Recommended Agents${colors.reset}`);
  console.log(`${colors.dim}──────────────────${colors.reset}`);

  const priorityColors: Record<string, string> = {
    high: colors.green,
    medium: colors.yellow,
    low: colors.dim,
  };

  recommendedAgents.forEach((agent) => {
    const priorityColor = priorityColors[agent.priority] || colors.dim;
    const priorityLabel = `[${agent.priority.toUpperCase()}]`;
    console.log(`  ${priorityColor}${priorityLabel}${colors.reset} ${colors.cyan}${agent.role}${colors.reset}`);
    console.log(`         ${colors.dim}${agent.reason}${colors.reset}`);
  });

  // Missing Skills
  if (missingSkills.length > 0) {
    console.log(`\n${colors.bold}Suggested Skills${colors.reset}`);
    console.log(`${colors.dim}────────────────${colors.reset}`);

    missingSkills.forEach((skill) => {
      console.log(`  ${colors.magenta}${skill.name}${colors.reset} ${colors.dim}(${skill.forFramework})${colors.reset}`);
      console.log(`         ${colors.dim}${skill.description}${colors.reset}`);
    });
  }

  // Suggested Workflows
  console.log(`\n${colors.bold}Suggested Workflows${colors.reset}`);
  console.log(`${colors.dim}───────────────────${colors.reset}`);

  suggestedWorkflows.forEach((workflow) => {
    console.log(`  ${colors.blue}${workflow.name}${colors.reset}`);
    console.log(`         ${colors.dim}${workflow.description}${colors.reset}`);
    console.log(`         ${colors.dim}Best for: ${workflow.suitableFor}${colors.reset}`);
  });

  // Next steps
  console.log(`\n${colors.bold}Next Steps${colors.reset}`);
  console.log(`${colors.dim}──────────${colors.reset}`);
  console.log(`  1. Run ${colors.cyan}squad init${colors.reset} to configure Claude Squad`);
  console.log(`  2. Customize agents in ${colors.dim}.claude/agents/${colors.reset}`);
  console.log(`  3. Add skills from ${colors.dim}.claude/skills/${colors.reset}`);
  console.log(`  4. Start a session with ${colors.cyan}squad start${colors.reset}\n`);
}

/**
 * Main analyze command handler
 */
export async function analyzeCommand(options?: { json?: boolean; verbose?: boolean }): Promise<void> {
  const projectPath = process.cwd();
  const asJson = options?.json ?? process.argv.includes("--json");

  if (!asJson) {
    console.log(`\n${colors.blue}ℹ${colors.reset} Analyzing project at ${colors.dim}${projectPath}${colors.reset}...\n`);
  }

  // Detect project
  const detection = await detectProjectType(projectPath);

  // Generate recommendations
  const recommendedAgents = generateAgentRecommendations(detection);
  const missingSkills = generateSkillRecommendations(detection);
  const suggestedWorkflows = generateWorkflowRecommendations(detection);

  const result: AnalysisResult = {
    detection,
    recommendedAgents,
    missingSkills,
    suggestedWorkflows,
  };

  displayResults(result, asJson);
}
