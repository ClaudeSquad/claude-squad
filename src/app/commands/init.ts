/**
 * Init Command
 *
 * AI-assisted project initialization wizard for Claude Squad.
 *
 * For existing projects:
 *   - Detects project type and technology stack
 *   - Configures appropriate agents and workflows
 *
 * For new projects:
 *   - Collects project description
 *   - AI suggests architecture
 *   - Scaffolds using official CLIs
 */

import { createInterface } from "readline";
import { stringify as yamlStringify } from "yaml";
import { join, basename } from "path";
import type { PartialSquadConfig } from "../config/schema.js";
import { saveProjectConfig, isInitialized, getProjectConfigPath } from "../config/loader.js";
import { detectProjectType, type ProjectDetection } from "./analyze.js";

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
 * Create a readline interface for user input
 */
function createPrompt(): ReturnType<typeof createInterface> {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
async function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user to select from options
 */
async function select(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: Array<{ value: string; label: string }>,
  allowMultiple = false
): Promise<string | string[]> {
  console.log(`\n${colors.cyan}${question}${colors.reset}`);
  options.forEach((opt, i) => {
    console.log(`  ${colors.dim}${i + 1}.${colors.reset} ${opt.label}`);
  });

  const hint = allowMultiple
    ? `${colors.dim}Enter numbers separated by commas (e.g., 1,3), or 0 for none:${colors.reset}`
    : `${colors.dim}Enter number (1-${options.length}):${colors.reset}`;

  console.log(hint);

  while (true) {
    const answer = await prompt(rl, "> ");

    if (allowMultiple) {
      if (answer === "0" || answer === "") {
        return [];
      }
      const indices = answer.split(",").map((s) => parseInt(s.trim(), 10) - 1);
      if (indices.every((i) => i >= 0 && i < options.length)) {
        return indices.map((i) => options[i]!.value);
      }
    } else {
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < options.length) {
        return options[index]!.value;
      }
    }

    console.log(`${colors.red}Invalid selection. Please try again.${colors.reset}`);
  }
}

/**
 * Display the init wizard banner
 */
function showBanner(): void {
  console.log(`
${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.cyan}${colors.bold}        Claude Squad - Project Initialization Wizard${colors.reset}
${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
`);
}

/**
 * Check if directory is empty or only contains hidden files
 */
async function isDirectoryEmpty(path: string): Promise<boolean> {
  try {
    const entries = await Array.fromAsync(new Bun.Glob("*").scan({ cwd: path, dot: false }));
    return entries.length === 0;
  } catch {
    return true;
  }
}

/**
 * Scaffold options for different project types
 */
const SCAFFOLD_OPTIONS = {
  frontend: [
    { value: "nextjs", label: "Next.js (React framework with SSR/SSG)" },
    { value: "vite-react", label: "Vite + React (Fast build tool)" },
    { value: "vite-vue", label: "Vite + Vue (Vue.js with Vite)" },
    { value: "astro", label: "Astro (Content-focused static sites)" },
    { value: "remix", label: "Remix (Full-stack React framework)" },
    { value: "svelte", label: "SvelteKit (Svelte framework)" },
  ],
  backend: [
    { value: "hono", label: "Hono (Fast, lightweight, edge-ready)" },
    { value: "express", label: "Express (Classic Node.js framework)" },
    { value: "fastify", label: "Fastify (High-performance)" },
    { value: "elysia", label: "Elysia (Bun-native, TypeScript-first)" },
  ],
  fullstack: [
    { value: "t3", label: "T3 Stack (Next.js + tRPC + Prisma + Tailwind)" },
    { value: "nuxt", label: "Nuxt (Vue.js full-stack framework)" },
  ],
  mobile: [
    { value: "expo", label: "Expo (React Native, simplified)" },
    { value: "react-native", label: "React Native CLI (Full control)" },
  ],
  monorepo: [{ value: "turborepo", label: "Turborepo (High-performance monorepo)" }],
  cli: [{ value: "clack", label: "Clack (Beautiful CLI prompts)" }],
};

/**
 * Integration options
 */
const INTEGRATION_OPTIONS = {
  sourceControl: [
    { value: "github", label: "GitHub" },
    { value: "gitlab", label: "GitLab" },
    { value: "bitbucket", label: "Bitbucket" },
    { value: "none", label: "None / Other" },
  ],
  issueTracking: [
    { value: "linear", label: "Linear" },
    { value: "jira", label: "Jira" },
    { value: "asana", label: "Asana" },
    { value: "notion", label: "Notion" },
    { value: "none", label: "None / Other" },
  ],
  communication: [
    { value: "slack", label: "Slack" },
    { value: "discord", label: "Discord" },
    { value: "email", label: "Email notifications" },
    { value: "teams", label: "Microsoft Teams" },
  ],
};

/**
 * Initialize existing project
 */
async function initExistingProject(
  rl: ReturnType<typeof createInterface>,
  projectPath: string
): Promise<PartialSquadConfig> {
  console.log(`\n${colors.blue}ℹ${colors.reset} Analyzing existing project...\n`);

  // Detect project type
  const detection = await detectProjectType(projectPath);
  displayDetection(detection);

  // Get project name
  const defaultName = basename(projectPath);
  const projectName = await prompt(
    rl,
    `\n${colors.cyan}Project name${colors.reset} ${colors.dim}(${defaultName})${colors.reset}: `
  );

  // Select integrations
  console.log(`\n${colors.bold}Configure Integrations${colors.reset}`);

  const sourceControl = (await select(
    rl,
    "Source Control:",
    INTEGRATION_OPTIONS.sourceControl
  )) as string;

  const issueTracking = (await select(
    rl,
    "Issue Tracking:",
    INTEGRATION_OPTIONS.issueTracking
  )) as string;

  const communication = (await select(
    rl,
    "Communication (select multiple or 0 for none):",
    INTEGRATION_OPTIONS.communication,
    true
  )) as string[];

  // Build config
  const config: PartialSquadConfig = {
    projectName: projectName || defaultName,
    projectPath,
    defaults: {
      workflow: "feature",
      model: "sonnet",
      maxConcurrentAgents: 5,
      reviewGateBehavior: "pause",
    },
    integrations: {
      sourceControl: sourceControl === "none" ? undefined : (sourceControl as any),
      issueTracking: issueTracking === "none" ? undefined : (issueTracking as any),
      communication: communication as any,
    },
  };

  return config;
}

/**
 * Display project detection results
 */
function displayDetection(detection: ProjectDetection): void {
  console.log(`${colors.bold}Detected Project:${colors.reset}`);
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
}

/**
 * Initialize new project (scaffolding wizard)
 */
async function initNewProject(
  rl: ReturnType<typeof createInterface>,
  projectPath: string
): Promise<PartialSquadConfig | null> {
  console.log(`\n${colors.blue}ℹ${colors.reset} Starting new project wizard...\n`);

  // Get project name
  const defaultName = basename(projectPath);
  const projectName = await prompt(
    rl,
    `${colors.cyan}Project name${colors.reset} ${colors.dim}(${defaultName})${colors.reset}: `
  );

  // Get project description
  console.log(`\n${colors.cyan}Describe your project:${colors.reset}`);
  console.log(`${colors.dim}(What are you building? What problem does it solve?)${colors.reset}`);
  const description = await prompt(rl, "> ");

  if (!description) {
    console.log(`${colors.yellow}⚠${colors.reset} A project description helps Claude suggest the best architecture.`);
  }

  // Select repository structure
  const repoStructure = (await select(rl, "Repository Structure:", [
    { value: "single", label: "Single repository (one project)" },
    { value: "monorepo", label: "Monorepo (multiple packages/apps)" },
    { value: "polyrepo", label: "Multiple repositories" },
  ])) as string;

  // Select project type
  const projectType = (await select(rl, "What type of project?", [
    { value: "fullstack", label: "Full-stack web application" },
    { value: "frontend", label: "Frontend only" },
    { value: "backend", label: "Backend/API only" },
    { value: "mobile", label: "Mobile application" },
    { value: "cli", label: "CLI tool" },
    { value: "library", label: "Library/Package" },
  ])) as string;

  // Show scaffold options based on type
  let scaffoldChoice: string | null = null;

  if (projectType === "fullstack") {
    scaffoldChoice = (await select(rl, "Choose a stack:", SCAFFOLD_OPTIONS.fullstack)) as string;
  } else if (projectType === "frontend") {
    scaffoldChoice = (await select(rl, "Choose a framework:", SCAFFOLD_OPTIONS.frontend)) as string;
  } else if (projectType === "backend") {
    scaffoldChoice = (await select(rl, "Choose a framework:", SCAFFOLD_OPTIONS.backend)) as string;
  } else if (projectType === "mobile") {
    scaffoldChoice = (await select(rl, "Choose a framework:", SCAFFOLD_OPTIONS.mobile)) as string;
  }

  // Monorepo setup
  if (repoStructure === "monorepo") {
    console.log(`\n${colors.yellow}Note:${colors.reset} Turborepo will be used to set up the monorepo structure.`);
  }

  // Display AI suggestion (placeholder for actual AI integration)
  console.log(`\n${colors.bold}${colors.magenta}AI Architecture Suggestion:${colors.reset}`);
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  if (scaffoldChoice) {
    console.log(`\nBased on your requirements, I recommend:`);
    console.log(`  • Stack: ${colors.cyan}${scaffoldChoice}${colors.reset}`);
    console.log(`  • Structure: ${colors.cyan}${repoStructure}${colors.reset}`);
    console.log(`\n${colors.dim}The AI architecture advisor will be fully implemented in Phase 2.`);
    console.log(`For now, you can proceed with manual scaffolding.${colors.reset}`);
  }

  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  // Confirm scaffold
  const shouldScaffold = await prompt(
    rl,
    `\n${colors.cyan}Would you like to scaffold this project? (y/n)${colors.reset} `
  );

  if (shouldScaffold.toLowerCase() === "y" && scaffoldChoice) {
    console.log(`\n${colors.yellow}⚠${colors.reset} Scaffolding is a Phase 2 feature.`);
    console.log(`${colors.dim}To scaffold manually, run:${colors.reset}`);

    const scaffoldCommands: Record<string, string> = {
      nextjs: "bunx create-next-app@latest .",
      "vite-react": "bunx create-vite . --template react-ts",
      "vite-vue": "bunx create-vite . --template vue-ts",
      astro: "bunx create-astro@latest .",
      remix: "bunx create-remix@latest .",
      svelte: "bunx create-svelte@latest .",
      hono: "bunx create-hono@latest .",
      express: "bunx express-generator .",
      fastify: "bunx fastify-cli generate .",
      elysia: "bun create elysia .",
      t3: "bunx create-t3-app@latest .",
      nuxt: "bunx nuxi init .",
      expo: "bunx create-expo-app .",
      "react-native": "bunx react-native init",
      turborepo: "bunx create-turbo@latest .",
    };

    const command = scaffoldCommands[scaffoldChoice];
    if (command) {
      console.log(`\n  ${colors.cyan}${command}${colors.reset}\n`);
    }
  }

  // Configure integrations
  console.log(`\n${colors.bold}Configure Integrations${colors.reset}`);

  const sourceControl = (await select(
    rl,
    "Source Control:",
    INTEGRATION_OPTIONS.sourceControl
  )) as string;

  const issueTracking = (await select(
    rl,
    "Issue Tracking:",
    INTEGRATION_OPTIONS.issueTracking
  )) as string;

  const communication = (await select(
    rl,
    "Communication (select multiple or 0 for none):",
    INTEGRATION_OPTIONS.communication,
    true
  )) as string[];

  // Build config
  const config: PartialSquadConfig = {
    projectName: projectName || defaultName,
    projectPath,
    defaults: {
      workflow: "feature",
      model: "sonnet",
      maxConcurrentAgents: 5,
      reviewGateBehavior: "pause",
    },
    integrations: {
      sourceControl: sourceControl === "none" ? undefined : (sourceControl as any),
      issueTracking: issueTracking === "none" ? undefined : (issueTracking as any),
      communication: communication as any,
    },
  };

  return config;
}

/**
 * Create default agent and workflow directories
 */
async function scaffoldDefaults(projectPath: string): Promise<void> {
  // Create .claude directory structure
  const claudeDir = join(projectPath, ".claude");
  const agentsDir = join(claudeDir, "agents");
  const skillsDir = join(claudeDir, "skills");
  const workflowsDir = join(claudeDir, "workflows");

  // Create directories by writing placeholder files
  // (Bun.write creates directories automatically)
  await Bun.write(join(agentsDir, ".gitkeep"), "");
  await Bun.write(join(skillsDir, ".gitkeep"), "");
  await Bun.write(join(workflowsDir, ".gitkeep"), "");

  // Create a sample workflow file
  const sampleWorkflow = `# Feature Development Workflow
# This is a sample workflow that will be used as the default

name: feature
description: Standard feature development workflow with architect, implementation, and review stages

stages:
  - name: planning
    execution: sequential
    agents:
      - architect
    requiresGate: true

  - name: implementation
    execution: parallel
    agents:
      - backend-engineer
      - frontend-engineer
    requiresGate: true

  - name: review
    execution: sequential
    agents:
      - qa-engineer
    requiresGate: false

reviewGates:
  - afterStage: planning
    behavior: pause
  - afterStage: implementation
    behavior: notify
`;

  await Bun.write(join(workflowsDir, "feature.yaml"), sampleWorkflow);
}

/**
 * Main init command handler
 */
export async function initCommand(): Promise<void> {
  showBanner();

  const projectPath = process.cwd();
  const rl = createPrompt();

  try {
    // Check if already initialized
    const initialized = await isInitialized(projectPath);
    if (initialized) {
      const configPath = await getProjectConfigPath(projectPath);
      console.log(`${colors.yellow}⚠${colors.reset} Claude Squad is already initialized in this project.`);
      console.log(`  Config: ${colors.dim}${configPath}${colors.reset}\n`);

      const reinit = await prompt(rl, `${colors.cyan}Re-initialize? This will overwrite existing config. (y/n)${colors.reset} `);
      if (reinit.toLowerCase() !== "y") {
        console.log(`\n${colors.dim}Initialization cancelled.${colors.reset}`);
        rl.close();
        return;
      }
    }

    // Check if directory is empty (new project) or has existing code
    const isEmpty = await isDirectoryEmpty(projectPath);

    let config: PartialSquadConfig | null = null;

    if (isEmpty) {
      // New project - ask what they want to do
      const projectChoice = (await select(rl, "This appears to be an empty directory. What would you like to do?", [
        { value: "new", label: "Start a new project (scaffold with AI assistance)" },
        { value: "existing", label: "Initialize for an existing project (files coming later)" },
      ])) as string;

      if (projectChoice === "new") {
        config = await initNewProject(rl, projectPath);
      } else {
        config = await initExistingProject(rl, projectPath);
      }
    } else {
      // Existing project
      config = await initExistingProject(rl, projectPath);
    }

    if (config) {
      // Save configuration
      console.log(`\n${colors.blue}ℹ${colors.reset} Saving configuration...`);
      await saveProjectConfig(config, projectPath);

      // Scaffold default directories
      console.log(`${colors.blue}ℹ${colors.reset} Creating default structure...`);
      await scaffoldDefaults(projectPath);

      // Success message
      const configPath = await getProjectConfigPath(projectPath);
      console.log(`\n${colors.green}✓${colors.reset} ${colors.bold}Claude Squad initialized successfully!${colors.reset}\n`);
      console.log(`Configuration saved to: ${colors.cyan}${configPath}${colors.reset}`);
      console.log(`\n${colors.bold}Created:${colors.reset}`);
      console.log(`  ${colors.dim}├──${colors.reset} .claude/squad.yaml ${colors.dim}(config)${colors.reset}`);
      console.log(`  ${colors.dim}├──${colors.reset} .claude/agents/ ${colors.dim}(custom agents)${colors.reset}`);
      console.log(`  ${colors.dim}├──${colors.reset} .claude/skills/ ${colors.dim}(custom skills)${colors.reset}`);
      console.log(`  ${colors.dim}└──${colors.reset} .claude/workflows/ ${colors.dim}(custom workflows)${colors.reset}`);

      console.log(`\n${colors.bold}Next steps:${colors.reset}`);
      console.log(`  1. Run ${colors.cyan}squad analyze${colors.reset} to see recommended agents`);
      console.log(`  2. Run ${colors.cyan}squad start${colors.reset} to begin a session`);
      console.log(`  3. Use ${colors.cyan}/feature <description>${colors.reset} to start your first feature\n`);
    }
  } catch (error) {
    console.error(`\n${colors.red}Error:${colors.reset} ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}
