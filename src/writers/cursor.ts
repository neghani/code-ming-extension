import * as path from "path";
import type { ToolId } from "../toolDetect";

function hasFrontmatter(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith("---");
}

function ensureFrontmatter(content: string, title: string): string {
  if (hasFrontmatter(content)) return content;
  const desc = title.replace(/"/g, '\\"');
  return `---
description: "${desc}"
alwaysApply: true
---

${content}`;
}

export function writePath(rootPath: string, slug: string, type: string): string {
  if (type === "skill") {
    return path.join(rootPath, ".cursor", "skills", slug, "SKILL.md");
  }
  return path.join(rootPath, ".cursor", "rules", `${slug}.mdc`);
}

export function writeContent(content: string, title: string, type: string): string {
  if (type === "skill") return content;
  return ensureFrontmatter(content, title);
}

export const toolId: ToolId = "cursor";
