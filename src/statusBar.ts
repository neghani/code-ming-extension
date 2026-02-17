import * as vscode from "vscode";

export function createStatusBar(context: vscode.ExtensionContext): void {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(item);

  const update = async (): Promise<void> => {
    const token = await context.secrets.get("codemint.token");
    const user = context.globalState.get<{ email: string }>("codemint.user");
    if (token && user) {
      item.text = "CodeMint: synced";
      item.tooltip = `Logged in as ${user.email}. Click to sync.`;
    } else {
      item.text = "CodeMint: not logged in";
      item.tooltip = "Click to open CodeMint output. Run CodeMint: Login to sign in.";
    }
    item.show();
  };

  item.command = "codemint.statusBarClick";
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.statusBarClick", async () => {
      const channel = vscode.window.createOutputChannel("CodeMint");
      channel.show();
      const token = await context.secrets.get("codemint.token");
      if (token) {
        await vscode.commands.executeCommand("codemint.sync");
      } else {
        channel.appendLine("Not logged in. Run CodeMint: Login from the command palette.");
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.refreshStatusBar", () => update())
  );
  update();
}
