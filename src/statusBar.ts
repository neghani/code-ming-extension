import * as vscode from "vscode";
import { getStoredToken } from "./auth";
import { getLogger, logError, logInfo } from "./logger";

export function createStatusBar(context: vscode.ExtensionContext): void {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(item);
  const channel = getLogger();

  const update = async (): Promise<void> => {
    try {
      const token = await getStoredToken(context);
      const user = context.globalState.get<{ email: string }>("codemint.user");
      logInfo(
        "auth state: token=" + (token ? "present" : "absent") + " user=" + (user ? "present" : "absent") + (user?.email ? " as " + user.email : "")
      );
      if (token && user) {
        item.text = "CodeMint: synced";
        item.tooltip = `Logged in as ${user.email}. Click to sync.`;
      } else {
        item.text = "CodeMint: not logged in";
        item.tooltip = "Click to open CodeMint output. Run CodeMint: Login to sign in.";
      }
      item.show();
    } catch (e) {
      logError("statusBar.update: failed", e);
    }
  };

  item.command = "codemint.statusBarClick";
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.statusBarClick", async () => {
      logInfo("command codemint.statusBarClick: invoked");
      channel.show(true);
      try {
        const token = await getStoredToken(context);
        if (token) {
          await vscode.commands.executeCommand("codemint.sync");
        } else {
          channel.appendLine("Not logged in. Run CodeMint: Login from the command palette.");
        }
      } catch (e) {
        logError("command codemint.statusBarClick: failed", e);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.refreshStatusBar", () => update())
  );
  update();
}
