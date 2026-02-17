import * as path from "path";
import * as vscode from "vscode";
import { readManifest, getEmptyManifest } from "./manifest";
import type { ManifestEntry } from "./types";

type TreeItem = ManifestEntry | { kind: "group"; label: string; type: "rule" | "skill" } | { kind: "status"; label: string };

let cachedInstalled: ManifestEntry[] = [];
let cachedStatus = "Not logged in";

function getRoot(): vscode.WorkspaceFolder | null {
  const folders = vscode.workspace.workspaceFolders;
  return folders?.length ? folders[0] : null;
}

export function createSidebar(context: vscode.ExtensionContext): void {
  const emitter = new vscode.EventEmitter<TreeItem | undefined>();
  const provider: vscode.TreeDataProvider<TreeItem> = {
    onDidChangeTreeData: emitter.event,
    getChildren(element: TreeItem | undefined): TreeItem[] {
      const root = getRoot();
      if (!root) return [{ kind: "status", label: "Open a folder" }];
      if (!element) {
        return [
          { kind: "group", label: "Rules", type: "rule" },
          { kind: "group", label: "Skills", type: "skill" },
          { kind: "status", label: "" },
        ];
      }
      if ("kind" in element && element.kind === "group") {
        return cachedInstalled.filter((e) => e.type === element.type);
      }
      if ("kind" in element && element.kind === "status") {
        return [];
      }
      return [];
    },
    getTreeItem(element: TreeItem): vscode.TreeItem {
      if ("kind" in element) {
        if (element.kind === "group") {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
          return item;
        }
        if (element.kind === "status") {
          const item = new vscode.TreeItem(cachedStatus, vscode.TreeItemCollapsibleState.None);
          return item;
        }
      }
      const entry = element as ManifestEntry;
      const item = new vscode.TreeItem(entry.slug, vscode.TreeItemCollapsibleState.None);
      item.description = entry.version;
      item.tooltip = entry.path;
      item.contextValue = "codemint.installedEntry";
      const root = getRoot();
      if (root) {
        item.resourceUri = vscode.Uri.file(path.join(root.uri.fsPath, entry.path));
        item.command = {
          command: "vscode.open",
          title: "Open",
          arguments: [item.resourceUri],
        };
      }
      return item;
    },
  };

  const refresh = async (): Promise<void> => {
    const root = getRoot();
    if (root) {
      const manifest = await readManifest(root) ?? getEmptyManifest();
      cachedInstalled = manifest.installed;
    } else {
      cachedInstalled = [];
    }
    const token = await context.secrets.get("codemint.token");
    const user = context.globalState.get<{ email: string }>("codemint.user");
    cachedStatus = token && user ? `Logged in as ${user.email}` : "Not logged in";
    emitter.fire(undefined);
  };

  const disposable = vscode.window.registerTreeDataProvider("codemint.installed", provider);
  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.refreshSidebar", () => refresh())
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.removeFromSidebar", async (node: TreeItem) => {
      if (!("kind" in node) || "catalogId" in node) {
        const entry = node as ManifestEntry;
        await vscode.commands.executeCommand("codemint.remove");
        await refresh();
      }
    })
  );

  vscode.workspace.onDidChangeWorkspaceFolders(() => refresh());
  refresh();
}
