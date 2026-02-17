import * as path from "path";
import type { ToolId } from "../toolDetect";

const TOOL_DIRS: Record<ToolId, string> = {
  cursor: ".cursor",
  cline: ".cline",
  windsurf: ".windsurf",
  continue: ".continue",
  copilot: ".github/instructions",
  claude: ".claude",
  codex: ".codex",
};

export function writePath(rootPath: string, slug: string, type: string, tool: ToolId): string {
  const dir = TOOL_DIRS[tool];
  const base = path.join(rootPath, dir);
  if (type === "skill") {
    if (tool === "cursor") return path.join(base, "skills", slug, "SKILL.md");
    if (tool === "cline") return path.join(base, "skills", slug, "SKILL.md");
    return path.join(base, "skills", `skill-${slug}.md`);
  }
  if (tool === "cursor") return path.join(base, "rules", `${slug}.mdc`);
  return path.join(base, "rules", `${slug}.md`);
}

export function writeContent(content: string, _title: string, _type: string): string {
  return content;
}
