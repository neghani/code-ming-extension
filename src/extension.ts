import * as vscode from "vscode";
import { registerAuthCommands } from "./auth";
import { registerAddCommand } from "./commands/add";
import { registerSyncCommand } from "./commands/sync";
import { registerRemoveCommand } from "./commands/remove";
import { registerSuggestCommand } from "./commands/suggest";
import { registerListCommand } from "./commands/list";
import { createSidebar } from "./sidebar";
import { createStatusBar } from "./statusBar";
import { createExploreView } from "./explore";
import { registerSettingsCommands } from "./settings";
import { getLogger, initializeLogger, logError, logInfo } from "./logger";

export function activate(context: vscode.ExtensionContext): void {
  initializeLogger(context);
  logInfo("activate: starting extension");
  registerAuthCommands(context);
  registerAddCommand(context);
  registerSyncCommand(context);
  registerRemoveCommand(context);
  registerSuggestCommand(context);
  registerListCommand(context);
  registerSettingsCommands(context);
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.showLogs", () => {
      getLogger().show(true);
    })
  );
  createSidebar(context);
  createStatusBar(context);
  createExploreView(context);

  const autoSync = async (): Promise<void> => {
    try {
      const auto = vscode.workspace.getConfiguration("codemint").get<boolean>("autoSync");
      if (!auto || !vscode.workspace.workspaceFolders?.length) return;
      const root = vscode.workspace.workspaceFolders[0];
      const { readManifest } = await import("./manifest");
      const manifest = await readManifest(root);
      if (manifest?.installed?.length) {
        logInfo("activate: autoSync triggered");
        void vscode.commands.executeCommand("codemint.sync").then(undefined, (e) => {
          logError("activate: autoSync command failed", e);
        });
      }
    } catch (e) {
      logError("activate: autoSync failed", e);
    }
  };
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => { void autoSync(); }));
  void autoSync();
  const baseUrl = vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
  logInfo("baseUrl=" + baseUrl);
  const hintShown = context.globalState.get<boolean>("codemint.hintShown");
  if (!hintShown) {
    getLogger().appendLine(
      "To use Sync/Suggest/Install run CodeMint: Login from the command palette; logging in only on the website does not sign the extension in."
    );
    context.globalState.update("codemint.hintShown", true);
  }
  logInfo("activate: extension ready");
}

export function deactivate(): void {
  logInfo("deactivate: extension stopped");
}
