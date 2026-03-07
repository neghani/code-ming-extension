import * as path from "path";
import * as vscode from "vscode";
import { getStoredToken } from "./auth";
import { readManifest, getEmptyManifest, writeManifest, removeEntry, removeEntryByRef, ensureManifestDir } from "./manifest";
import type { ManifestEntry } from "./types";
import { errorMessage, logError, logInfo, logWarn } from "./logger";

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
    try {
      const root = getRoot();
      if (root) {
        const manifest = await readManifest(root) ?? getEmptyManifest();
        cachedInstalled = manifest.installed;
      } else {
        cachedInstalled = [];
      }
      const token = await getStoredToken(context);
      const user = context.globalState.get<{ email: string }>("codemint.user");
      logInfo(
        "auth state: token=" + (token ? "present" : "absent") + " user=" + (user ? "present" : "absent") + (user?.email ? " as " + user.email : "")
      );
      cachedStatus = token && user ? `Logged in as ${user.email}` : "Not logged in";
      emitter.fire(undefined);
    } catch (e) {
      logError("sidebar.refresh: failed", e);
      cachedStatus = `Error: ${errorMessage(e)}`;
      emitter.fire(undefined);
    }
  };

  const disposable = vscode.window.registerTreeDataProvider("codemint.installed", provider);
  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.refreshSidebar", async () => {
      logInfo("command codemint.refreshSidebar: invoked");
      await refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.removeFromSidebar", async (node: TreeItem) => {
      logInfo("command codemint.removeFromSidebar: invoked");
      if ("kind" in node) return;
      const entry = node as ManifestEntry;
      const root = getRoot();
      if (!root) {
        vscode.window.showWarningMessage("CodeMint: Open a folder first.");
        return;
      }
      try {
        let manifest = await readManifest(root) ?? getEmptyManifest();
        await ensureManifestDir(root);
        const fullPath = path.join(root.uri.fsPath, entry.path);
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(fullPath));
        } catch (e) {
          logWarn("removeFromSidebar: delete failed " + (e instanceof Error ? e.message : String(e)));
        }
        const hasValidCatalogId = typeof entry.catalogId === "string" && entry.catalogId.trim().length > 0;
        manifest = hasValidCatalogId ? removeEntry(manifest, entry.catalogId) : removeEntryByRef(manifest, entry.ref);
        await writeManifest(root, manifest);
        await refresh();
        logInfo(`codemint.removeFromSidebar: removed @${entry.type}/${entry.slug}`);
        vscode.window.showInformationMessage(`CodeMint: Removed ${entry.slug}.`);
      } catch (e) {
        logError("codemint.removeFromSidebar: failed", e);
        vscode.window.showErrorMessage(`CodeMint: ${errorMessage(e)}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void refresh();
    })
  );
  void refresh();
}
