import * as path from "path";
import type { ToolId } from "../toolDetect";

function hasFrontmatter(content: string): boolean {
  const trimmed = (content ?? "").trimStart();
  return trimmed.startsWith("---");
}

function ensureFrontmatter(
  content: string,
  title: string,
  applyMode?: string,
  globs?: string | null
): string {
  if (hasFrontmatter(content)) return content;
  const desc = title.replace(/"/g, '\\"');
  const alwaysApply = applyMode === "always";
  let fm = `---
description: "${desc}"
alwaysApply: ${alwaysApply}
`;
  if (applyMode === "glob" && globs) {
    fm += `globs: ${globs}\n`;
  }
  fm += `---

${content ?? ""}`;
  return fm;
}

export function writePath(rootPath: string, slug: string, type: string): string {
  if (type === "skill") {
    return path.join(rootPath, ".cursor", "skills", slug, "SKILL.md");
  }
  return path.join(rootPath, ".cursor", "rules", `${slug}.mdc`);
}

export function writeContent(
  content: string,
  title: string,
  type: string,
  applyMode?: string,
  globs?: string | null
): string {
  if (type === "skill") return content;
  return ensureFrontmatter(content, title, applyMode, globs);
}

export const toolId: ToolId = "cursor";
