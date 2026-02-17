import * as path from "path";
import * as vscode from "vscode";
import { readManifest, getEmptyManifest } from "../manifest";

export function registerListCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.list", async () => {
      try {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          vscode.window.showWarningMessage("CodeMint: Open a folder first.");
          return;
        }
        const root = folders[0];
        const manifest = await readManifest(root) ?? getEmptyManifest();
        if (!manifest.installed.length) {
          vscode.window.showInformationMessage("CodeMint: Nothing installed.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          manifest.installed.map((e) => ({
            label: e.slug,
            description: e.ref,
            detail: `${e.tool} · ${e.path}`,
            path: path.join(root.uri.fsPath, e.path),
          })),
          { title: "Installed — open file" }
        );
        if (!picked) return;

        const doc = await vscode.workspace.openTextDocument(picked.path);
        await vscode.window.showTextDocument(doc);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );
}
