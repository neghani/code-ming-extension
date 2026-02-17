"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoredToken = getStoredToken;
exports.login = login;
exports.logout = logout;
exports.registerAuthCommands = registerAuthCommands;
const http = __importStar(require("http"));
const vscode = __importStar(require("vscode"));
const api_1 = require("./api");
const types_1 = require("./types");
function getBaseUrl() {
    return vscode.workspace.getConfiguration("codemint").get("baseUrl") ?? "https://codemint.app";
}
function trimTrailingSlash(s) {
    return s.replace(/\/+$/, "");
}
function getStoredToken(context) {
    return context.secrets.get(types_1.SECRET_KEY);
}
async function login(context) {
    const baseUrl = trimTrailingSlash(getBaseUrl());
    const server = http.createServer((req, res) => {
        const url = req.url ?? "/";
        const q = url.indexOf("?");
        const params = new URLSearchParams(q >= 0 ? url.slice(q) : "");
        const token = params.get("token");
        res.writeHead(200, { "Content-Type": "text/html" });
        if (token) {
            res.end("<!DOCTYPE html><html><body><p>Authorization successful. You can close this tab and return to the editor.</p></body></html>");
            server._token = token;
        }
        else {
            res.end("<!DOCTYPE html><html><body><p>Missing token. Try CodeMint: Login again from the editor.</p></body></html>");
        }
        server.close();
    });
    await new Promise((resolve, reject) => {
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
    await new Promise((resolve) => {
        server.on("close", () => resolve());
        setTimeout(() => {
            server.close();
            resolve();
        }, 300000);
    });
    const token = server._token;
    if (!token) {
        throw new Error("No token received. Complete the login in the browser.");
    }
    const { user } = await (0, api_1.authMe)(token);
    await context.secrets.store(types_1.SECRET_KEY, token);
    await context.globalState.update("codemint.user", { email: user.email, name: user.name });
    vscode.window.showInformationMessage(`CodeMint: Logged in as ${user.email}`);
    await vscode.commands.executeCommand("codemint.refreshSidebar");
    await vscode.commands.executeCommand("codemint.refreshStatusBar");
}
async function logout(context) {
    await context.secrets.delete(types_1.SECRET_KEY);
    await context.globalState.update("codemint.user", undefined);
    vscode.window.showInformationMessage("CodeMint: Logged out.");
    await vscode.commands.executeCommand("codemint.refreshSidebar");
    await vscode.commands.executeCommand("codemint.refreshStatusBar");
}
function registerAuthCommands(context) {
    context.subscriptions.push(vscode.commands.registerCommand("codemint.login", () => {
        login(context).catch((e) => {
            const msg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`CodeMint: ${msg}`);
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("codemint.logout", () => {
        logout(context).catch((e) => {
            const msg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`CodeMint: ${msg}`);
        });
    }));
}
//# sourceMappingURL=auth.js.map