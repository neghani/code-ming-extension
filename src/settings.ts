import * as vscode from "vscode";

export function registerSettingsCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.setBaseUrl", async () => {
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
      vscode.window.showInformationMessage(`CodeMint: App URL set to ${url}`);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:codemint"
      );
    })
  );
}
