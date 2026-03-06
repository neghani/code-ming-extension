import * as vscode from "vscode";
import { errorMessage, logError, logInfo } from "./logger";

export function registerSettingsCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.setBaseUrl", async () => {
      try {
        logInfo("command codemint.setBaseUrl: invoked");
        const config = vscode.workspace.getConfiguration("codemint");
        const current = config.get<string>("baseUrl") ?? "https://codemint.app";
        const value = await vscode.window.showInputBox({
          prompt: "CodeMint app URL (used for login and API)",
          value: current,
          placeHolder: "https://codemint.app",
        });
        if (value === undefined) return;
        const trimmed = value.trim();
        if (!trimmed) {
          vscode.window.showWarningMessage("CodeMint: URL cannot be empty.");
          return;
        }
        const url = trimmed.replace(/\/+$/, "");
        await config.update("baseUrl", url, vscode.ConfigurationTarget.Global);
        logInfo(`command codemint.setBaseUrl: updated to ${url}`);
        vscode.window.showInformationMessage(`CodeMint: App URL set to ${url}`);
      } catch (e) {
        logError("command codemint.setBaseUrl: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openSettings", () => {
      logInfo("command codemint.openSettings: invoked");
      void vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:codemint"
      ).then(undefined, (e) => {
        logError("command codemint.openSettings: failed", e);
      });
    })
  );
}
