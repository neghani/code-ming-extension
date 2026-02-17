import * as vscode from "vscode";
import * as path from "path";

export type ToolId =
  | "cursor"
  | "cline"
  | "windsurf"
  | "continue"
  | "copilot"
  | "claude"
  | "codex";

const DETECTION_ORDER: { id: ToolId; markers: string[] }[] = [
  { id: "cursor", markers: [".cursor"] },
  { id: "cline", markers: [".cline", ".clinerules"] },
  { id: "windsurf", markers: [".windsurf"] },
  { id: "continue", markers: [".continue"] },
  { id: "copilot", markers: [".github/instructions"] },
  { id: "claude", markers: ["CLAUDE.md", ".claude"] },
  { id: "codex", markers: [".codex"] },
];

export async function detectTool(root: vscode.WorkspaceFolder): Promise<ToolId | null> {
  const overrides = vscode.workspace.getConfiguration("codemint").get<string[]>("toolOverrides");
  if (overrides?.length) {
    const first = overrides[0].toLowerCase();
    if (["cursor", "cline", "windsurf", "continue", "copilot", "claude", "codex"].includes(first)) {
      return first as ToolId;
    }
  }
  const rootPath = root.uri.fsPath;
  for (const { id, markers } of DETECTION_ORDER) {
    for (const marker of markers) {
      const p = path.join(rootPath, marker);
      try {
        const stat = await vscode.workspace.fs.stat(vscode.Uri.file(p));
        if (stat.type === vscode.FileType.Directory || stat.type === vscode.FileType.File) {
          return id;
        }
      } catch {
        // not found
      }
    }
  }
  return null;
}

export async function getWorkspaceRoot(): Promise<vscode.WorkspaceFolder | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return null;
  return folders[0];
}

export async function ensureTool(context: vscode.ExtensionContext): Promise<{ root: vscode.WorkspaceFolder; tool: ToolId }> {
  const root = await getWorkspaceRoot();
  if (!root) throw new Error("Open a folder first.");
  let tool = await detectTool(root);
  if (!tool) {
    const picked = await vscode.window.showQuickPick(
      [
        { label: "Cursor", value: "cursor" as ToolId },
        { label: "Cline", value: "cline" as ToolId },
        { label: "Windsurf", value: "windsurf" as ToolId },
        { label: "Continue", value: "continue" as ToolId },
        { label: "Copilot", value: "copilot" as ToolId },
        { label: "Claude", value: "claude" as ToolId },
        { label: "Codex", value: "codex" as ToolId },
      ],
      { title: "No AI tool folder detected. Choose one to create:" }
    );
    if (!picked) throw new Error("No tool selected.");
    tool = picked.value;
    const dir = getToolDir(tool);
    const fullPath = path.join(root.uri.fsPath, dir);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(fullPath));
    if (tool === "cursor") {
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.join(fullPath, "rules")));
      await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.join(fullPath, "skills")));
    }
  }
  return { root, tool };
}

export function getToolDir(tool: ToolId): string {
  const map: Record<ToolId, string> = {
    cursor: ".cursor",
    cline: ".cline",
    windsurf: ".windsurf",
    continue: ".continue",
    copilot: ".github/instructions",
    claude: ".claude",
    codex: ".codex",
  };
  return map[tool];
}
