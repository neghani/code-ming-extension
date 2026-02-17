import * as path from "path";
import type { ToolId } from "../toolDetect";

export function writePath(rootPath: string, slug: string, type: string): string {
  const base = path.join(rootPath, ".github", "instructions");
  if (type === "skill") {
    return path.join(base, "skills", `skill-${slug}.instructions.md`);
  }
  return path.join(base, `${slug}.instructions.md`);
}

export function writeContent(content: string, _title: string, _type: string): string {
  return content;
}

export const toolId: ToolId = "copilot";
