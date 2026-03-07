import * as path from "path";
import * as vscode from "vscode";
import { readManifest, getEmptyManifest } from "../manifest";
import { errorMessage, logError, logInfo } from "../logger";

export function registerListCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.list", async () => {
      try {
        logInfo("command codemint.list: invoked");
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          vscode.window.showWarningMessage("CodeMint: Open a folder first.");
          return;
        }
        const root = folders[0];
        const manifest = await readManifest(root) ?? getEmptyManifest();
        const valid = manifest.installed.filter(
          (e) => e.path && String(e.path).trim().length > 0
        );
        if (!valid.length) {
          vscode.window.showInformationMessage("CodeMint: Nothing installed.");
          return;
        }

        const picked = await vscode.window.showQuickPick(
          valid.map((e) => ({
            label: e.slug,
            description: e.ref,
            detail: `${e.tool} · ${e.path}`,
            path: path.join(root.uri.fsPath, e.path),
          })),
          { title: "Installed — open file" }
        );
        if (!picked) return;

        try {
          const doc = await vscode.workspace.openTextDocument(picked.path);
          await vscode.window.showTextDocument(doc);
          logInfo(`command codemint.list: opened ${picked.path}`);
        } catch (openErr) {
          vscode.window.showErrorMessage("CodeMint: File not found.");
          logError("command codemint.list: openTextDocument failed", openErr);
        }
      } catch (e) {
        logError("command codemint.list: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );
}
