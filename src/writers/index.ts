import * as path from "path";
import type { ToolId } from "../toolDetect";
import * as cursor from "./cursor";
import * as copilot from "./copilot";
import * as generic from "./generic";

export function writePath(rootPath: string, slug: string, type: string, tool: ToolId): string {
  if (tool === "cursor") return cursor.writePath(rootPath, slug, type);
  if (tool === "copilot") return copilot.writePath(rootPath, slug, type);
  return generic.writePath(rootPath, slug, type, tool);
}

export function writeContent(content: string, title: string, type: string, tool: ToolId): string {
  if (tool === "cursor") return cursor.writeContent(content, title, type);
  if (tool === "copilot") return copilot.writeContent(content, title, type);
  return generic.writeContent(content, title, type);
}
