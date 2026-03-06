import * as http from "http";
import * as vscode from "vscode";
import { authMe } from "./api";
import { SECRET_KEY } from "./types";
import { errorMessage, logError, logInfo } from "./logger";

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
  logInfo(`auth.login: starting with baseUrl=${baseUrl}`);
  let receivedToken: string | undefined;
  const server = http.createServer((req, res) => {
    const url = req.url ?? "/";
    const q = url.indexOf("?");
    const params = new URLSearchParams(q >= 0 ? url.slice(q) : "");
    const token = params.get("token");
    if (token) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<!DOCTYPE html><html><body><p>Authorization successful. You can close this tab and return to the editor.</p></body></html>"
      );
      receivedToken = token;
      logInfo("auth.login: received callback token");
      server.close();
      return;
    }
    if (url.startsWith("/favicon")) {
      res.writeHead(204);
      res.end();
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<!DOCTYPE html><html><body><p>Waiting for token. Complete login from CodeMint in your browser tab.</p></body></html>"
    );
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
  logInfo(`auth.login: opening browser callback url on port ${port}`);
  await vscode.env.openExternal(vscode.Uri.parse(authUrl));
  await new Promise<void>((resolve) => {
    server.on("close", () => resolve());
    setTimeout(() => {
      server.close();
      resolve();
    }, 300000);
  });
  const token = receivedToken;
  if (!token) {
    throw new Error("No token received. Complete the login in the browser.");
  }
  const { user } = await authMe(token);
  await context.secrets.store(SECRET_KEY, token);
  await context.globalState.update("codemint.user", { email: user.email, name: user.name });
  logInfo(`auth.login: completed for ${user.email}`);
  vscode.window.showInformationMessage(`CodeMint: Logged in as ${user.email}`);
  await vscode.commands.executeCommand("codemint.refreshSidebar");
  await vscode.commands.executeCommand("codemint.refreshStatusBar");
}

export async function logout(context: vscode.ExtensionContext): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
  await context.globalState.update("codemint.user", undefined);
  logInfo("auth.logout: completed");
  vscode.window.showInformationMessage("CodeMint: Logged out.");
  await vscode.commands.executeCommand("codemint.refreshSidebar");
  await vscode.commands.executeCommand("codemint.refreshStatusBar");
}

export function registerAuthCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.login", () => {
      logInfo("command codemint.login: invoked");
      login(context).catch((e) => {
        logError("command codemint.login: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      });
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("codemint.logout", () => {
      logInfo("command codemint.logout: invoked");
      logout(context).catch((e) => {
        logError("command codemint.logout: failed", e);
        const msg = errorMessage(e);
        vscode.window.showErrorMessage(`CodeMint: ${msg}`);
      });
    })
  );
}
