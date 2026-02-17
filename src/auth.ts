import * as http from "http";
import * as vscode from "vscode";
import { authMe } from "./api";
import { SECRET_KEY } from "./types";

function getBaseUrl(): string {
  return vscode.workspace.getConfiguration("codemint").get<string>("baseUrl") ?? "https://codemint.app";
}

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export function getStoredToken(context: vscode.ExtensionContext): Thenable<string | undefined> {
  return context.secrets.get(SECRET_KEY);
}

export async function login(context: vscode.ExtensionContext): Promise<void> {
  const baseUrl = trimTrailingSlash(getBaseUrl());
  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    const q = url.indexOf("?");
    const params = new URLSearchParams(q >= 0 ? url.slice(q) : "");
    const token = params.get("token");
    res.writeHead(200, { "Content-Type": "text/html" });
    if (token) {
      res.end(
        "<!DOCTYPE html><html><body><p>Authorization successful. You can close this tab and return to the editor.</p></body></html>"
      );
      (server as unknown as { _token?: string })._token = token;
    } else {
      res.end(
        "<!DOCTYPE html><html><body><p>Missing token. Try CodeMint: Login again from the editor.</p></body></html>"
      );
    }
    server.close();
  });
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });
  const addr = server.address();
  const port = addr && typeof addr === "object" && "port" in addr ? addr.port : 0;
  if (!port) {
    server.close();
    throw new Error("Could not bind to a port");
  }
  const authUrl = `${baseUrl}/cli-auth?port=${port}`;
  await vscode.env.openExternal(vscode.Uri.parse(authUrl));
  await new Promise<void>((resolve) => {
    server.on("close", () => resolve());
    setTimeout(() => {
      server.close();
      resolve();
    }, 300000);
  });
  const token = (server as unknown as { _token?: string })._token;
  if (!token) {
    throw new Error("No token received. Complete the login in the browser.");
  }
  const { user } = await authMe(token);
  await context.secrets.store(SECRET_KEY, token);
  await context.globalState.update("codemint.user", { email: user.email, name: user.name });
  vscode.window.showInformationMessage(`CodeMint: Logged in as ${user.email}`);
  await vscode.commands.executeCommand("codemint.refreshSidebar");
  await vscode.commands.executeCommand("codemint.refreshStatusBar");
}

export async function logout(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
  await context.globalState.update("codemint.user", undefined);
  vscode.window.showInformationMessage("CodeMint: Logged out.");
  await vscode.commands.executeCommand("codemint.refreshSidebar");
  await vscode.commands.executeCommand("codemint.refreshStatusBar");
}

export function registerAuthCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.login", () => {
      login(context).catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.logout", () => {
      logout(context).catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      });
    })
  );
}
