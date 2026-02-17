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
exports.registerRemoveCommand = void 0;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const manifest_1 = require("../manifest");
function registerRemoveCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand("codemint.remove", async () => {
        try {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders?.length) {
                vscode.window.showWarningMessage("CodeMint: Open a folder first.");
                return;
            }
            const root = folders[0];
            let manifest = await (0, manifest_1.readManifest)(root) ?? (0, manifest_1.getEmptyManifest)();
            await (0, manifest_1.ensureManifestDir)(root);
            if (!manifest.installed.length) {
                vscode.window.showInformationMessage("CodeMint: Nothing installed.");
                return;
            }
            const picked = await vscode.window.showQuickPick(manifest.installed.map((e) => ({
                label: e.slug,
                description: e.ref,
                detail: `${e.tool} · ${e.version}`,
                entry: e,
            })), { title: "Select item to remove" });
            if (!picked)
                return;
            const { entry } = picked;
            const fullPath = path.join(root.uri.fsPath, entry.path);
            try {
                await vscode.workspace.fs.delete(vscode.Uri.file(fullPath));
            }
            catch {
                // file may already be deleted
            }
            manifest = (0, manifest_1.removeEntry)(manifest, entry.catalogId);
            await (0, manifest_1.writeManifest)(root, manifest);
            await vscode.commands.executeCommand("codemint.refreshSidebar");
            vscode.window.showInformationMessage(`CodeMint: Removed ${entry.slug}.`);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`CodeMint: ${msg}`);
        }
    }));
}
exports.registerRemoveCommand = registerRemoveCommand;
//# sourceMappingURL=remove.js.map