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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSidebar = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const manifest_1 = require("./manifest");
let cachedInstalled = [];
let cachedStatus = "Not logged in";
function getRoot() {
    const folders = vscode.workspace.workspaceFolders;
    return folders?.length ? folders[0] : null;
}
function createSidebar(context) {
    const emitter = new vscode.EventEmitter();
    const provider = {
        onDidChangeTreeData: emitter.event,
        getChildren(element) {
            const root = getRoot();
            if (!root)
                return [{ kind: "status", label: "Open a folder" }];
            if (!element) {
                return [
                    { kind: "group", label: "Rules", type: "rule" },
                    { kind: "group", label: "Skills", type: "skill" },
                    { kind: "status", label: "" },
                ];
            }
            if ("kind" in element && element.kind === "group") {
                return cachedInstalled.filter((e) => e.type === element.type);
            }
            if ("kind" in element && element.kind === "status") {
                return [];
            }
            return [];
        },
        getTreeItem(element) {
            if ("kind" in element) {
                if (element.kind === "group") {
                    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
                    return item;
                }
                if (element.kind === "status") {
                    const item = new vscode.TreeItem(cachedStatus, vscode.TreeItemCollapsibleState.None);
                    return item;
                }
            }
            const entry = element;
            const item = new vscode.TreeItem(entry.slug, vscode.TreeItemCollapsibleState.None);
            item.description = entry.version;
            item.tooltip = entry.path;
            item.contextValue = "codemint.installedEntry";
            const root = getRoot();
            if (root) {
                item.resourceUri = vscode.Uri.file(path.join(root.uri.fsPath, entry.path));
                item.command = {
                    command: "vscode.open",
                    title: "Open",
                    arguments: [item.resourceUri],
                };
            }
            return item;
        },
    };
    const refresh = async () => {
        const root = getRoot();
        if (root) {
            const manifest = await (0, manifest_1.readManifest)(root) ?? (0, manifest_1.getEmptyManifest)();
            cachedInstalled = manifest.installed;
        }
        else {
            cachedInstalled = [];
        }
        const token = await context.secrets.get("codemint.token");
        const user = context.globalState.get("codemint.user");
        cachedStatus = token && user ? `Logged in as ${user.email}` : "Not logged in";
        emitter.fire(undefined);
    };
    const disposable = vscode.window.registerTreeDataProvider("codemint.installed", provider);
    context.subscriptions.push(disposable);
    context.subscriptions.push(vscode.commands.registerCommand("codemint.refreshSidebar", () => refresh()));
    context.subscriptions.push(vscode.commands.registerCommand("codemint.removeFromSidebar", async (node) => {
        if (!("kind" in node) || "catalogId" in node) {
            const entry = node;
            await vscode.commands.executeCommand("codemint.remove");
            await refresh();
        }
    }));
    vscode.workspace.onDidChangeWorkspaceFolders(() => refresh());
    refresh();
}
exports.createSidebar = createSidebar;
//# sourceMappingURL=sidebar.js.map