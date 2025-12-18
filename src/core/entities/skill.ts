/**
 * Skill Entity
 *
 * Represents a reusable skill that can be assigned to agents.
 * Skills provide specialized knowledge and capabilities through
 * markdown content that gets injected into agent prompts.
 */

import { z } from "zod";
import type { SkillId } from "../types/id";
import { createIdPattern } from "../types/id";
import { DateSchema, SourceTypeSchema } from "../types/common";

// ============================================================================
// Skill Name Validation
// ============================================================================

/**
 * Pattern for valid skill names: lowercase letters, numbers, and hyphens.
 * Must start with a letter.
 */
const SKILL_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Skill name schema with validation.
 */
export const SkillNameSchema = z
  .string()
  .min(2, "Skill name must be at least 2 characters")
  .max(50, "Skill name must be at most 50 characters")
  .regex(
    SKILL_NAME_PATTERN,
    "Skill name must be lowercase-with-hyphens (e.g., 'react-patterns')"
  );

// ============================================================================
// Semantic Version
// ============================================================================

/**
 * Semantic version pattern.
 */
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Semantic version schema.
 */
export const SemverSchema = z
  .string()
  .regex(SEMVER_PATTERN, "Version must be in semver format (e.g., '1.0.0')");

// ============================================================================
// Skill Entity
// ============================================================================

/**
 * ID validation pattern.
 */
const SkillIdPattern = createIdPattern("skl");

/**
 * Skill entity schema.
 */
export const SkillSchema = z.object({
  /** Unique skill identifier */
  id: z.string().regex(SkillIdPattern, "Invalid SkillId format"),
  /** Skill name (lowercase-with-hyphens) */
  name: SkillNameSchema,
  /** Description of what the skill does and when to use it */
  description: z.string().min(10, "Description must be at least 10 characters"),
  /** Markdown content with skill instructions */
  content: z.string().min(1, "Content is required"),
  /** Semantic version */
  version: SemverSchema.default("1.0.0"),
  /** Origin of the skill */
  source: SourceTypeSchema.default("custom"),
  /** Optional tool restrictions */
  allowedTools: z.array(z.string()).optional(),
  /** Categorization tags */
  tags: z.array(z.string()).default([]),
  /** Author information */
  author: z.string().optional(),
  /** Whether the skill is active */
  isActive: z.boolean().default(true),
  /** Creation timestamp */
  createdAt: DateSchema,
  /** Last update timestamp */
  updatedAt: DateSchema,
});

/**
 * Skill entity type.
 */
export type Skill = z.infer<typeof SkillSchema>;

/**
 * Typed Skill with branded IDs.
 */
export interface TypedSkill extends Omit<Skill, "id"> {
  id: SkillId;
}

// ============================================================================
// Partial & Creation Schemas
// ============================================================================

/**
 * Partial skill schema for updates.
 */
export const PartialSkillSchema = SkillSchema.partial();
export type PartialSkill = z.infer<typeof PartialSkillSchema>;

/**
 * Schema for creating a new skill.
 */
export const CreateSkillSchema = SkillSchema.omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  createdAt: DateSchema.optional(),
  updatedAt: DateSchema.optional(),
});
export type CreateSkill = z.infer<typeof CreateSkillSchema>;

/**
 * Schema for updating an existing skill.
 */
export const UpdateSkillSchema = SkillSchema.partial().omit({
  id: true,
  createdAt: true,
}).extend({
  updatedAt: DateSchema.optional(),
});
export type UpdateSkill = z.infer<typeof UpdateSkillSchema>;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate skill data.
 * @throws ZodError if validation fails
 */
export function validateSkill(data: unknown): Skill {
  return SkillSchema.parse(data);
}

/**
 * Safely validate skill data.
 */
export function safeValidateSkill(data: unknown): {
  success: boolean;
  data?: Skill;
  error?: z.ZodError;
} {
  const result = SkillSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new skill with defaults.
 */
export function createSkill(
  data: Omit<CreateSkill, "createdAt" | "updatedAt" | "version" | "source" | "tags" | "isActive"> &
    Partial<Pick<CreateSkill, "version" | "source" | "tags" | "isActive">>
): Skill {
  const now = new Date();
  return SkillSchema.parse({
    ...data,
    version: data.version ?? "1.0.0",
    source: data.source ?? "custom",
    tags: data.tags ?? [],
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update a skill with new data.
 */
export function updateSkill(skill: Skill, updates: UpdateSkill): Skill {
  return SkillSchema.parse({
    ...skill,
    ...updates,
    updatedAt: new Date(),
  });
}

// ============================================================================
// Export Format
// ============================================================================

/**
 * Skill export frontmatter schema (for SKILL.md files).
 */
export const SkillFrontmatterSchema = z.object({
  name: SkillNameSchema,
  description: z.string(),
  "allowed-tools": z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  version: SemverSchema.optional(),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

/**
 * Convert a skill to export format (frontmatter + content).
 */
export function skillToMarkdown(skill: Skill): string {
  const frontmatter: SkillFrontmatter = {
    name: skill.name,
    description: skill.description,
    ...(skill.allowedTools && { "allowed-tools": skill.allowedTools }),
    ...(skill.tags.length > 0 && { tags: skill.tags }),
    version: skill.version,
  };

  const yamlLines = Object.entries(frontmatter)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
      }
      return `${key}: ${value}`;
    });

  return `---\n${yamlLines.join("\n")}\n---\n\n${skill.content}`;
}
