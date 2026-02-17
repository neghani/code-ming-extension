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

export function activate(context: vscode.ExtensionContext): void {
  registerAuthCommands(context);
  registerAddCommand(context);
  registerSyncCommand(context);
  registerRemoveCommand(context);
  registerSuggestCommand(context);
  registerListCommand(context);
  registerSettingsCommands(context);
  createSidebar(context);
  createStatusBar(context);
  createExploreView(context);

  const autoSync = async (): Promise<void> => {
    const auto = vscode.workspace.getConfiguration("codemint").get<boolean>("autoSync");
    if (!auto || !vscode.workspace.workspaceFolders?.length) return;
    const root = vscode.workspace.workspaceFolders[0];
    const { readManifest } = await import("./manifest");
    const manifest = await readManifest(root);
    if (manifest?.installed?.length) {
      void vscode.commands.executeCommand("codemint.sync").then(undefined, () => {});
    }
  };
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => { autoSync(); }));
  autoSync();
}

export function deactivate(): void {}
