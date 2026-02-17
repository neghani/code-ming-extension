import * as path from "path";
import * as vscode from "vscode";
import { readManifest, writeManifest, removeEntry, getEmptyManifest, ensureManifestDir } from "../manifest";

export function registerRemoveCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.remove", async () => {
      try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          vscode.window.showWarningMessage("CodeMint: Open a folder first.");
          return;
        }
        const root = folders[0];
        let manifest = await readManifest(root) ?? getEmptyManifest();
        await ensureManifestDir(root);
        if (!manifest.installed.length) {
          vscode.window.showInformationMessage("CodeMint: Nothing installed.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          manifest.installed.map((e) => ({
            label: e.slug,
            description: e.ref,
            detail: `${e.tool} · ${e.version}`,
            entry: e,
          })),
          { title: "Select item to remove" }
        );
        if (!picked) return;

        const { entry } = picked;
        const fullPath = path.join(root.uri.fsPath, entry.path);
        try {
          await vscode.workspace.fs.delete(vscode.Uri.file(fullPath));
        } catch {
          // file may already be deleted
        }
        manifest = removeEntry(manifest, entry.catalogId);
        await writeManifest(root, manifest);
        await vscode.commands.executeCommand("codemint.refreshSidebar");
        vscode.window.showInformationMessage(`CodeMint: Removed ${entry.slug}.`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );
}
