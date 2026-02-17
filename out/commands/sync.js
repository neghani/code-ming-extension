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
exports.registerSyncCommand = registerSyncCommand;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const auth_1 = require("../auth");
const api_1 = require("../api");
const manifest_1 = require("../manifest");
const writers_1 = require("../writers");
function registerSyncCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand("codemint.sync", async () => {
        const channel = vscode.window.createOutputChannel("CodeMint");
        try {
            const token = await (0, auth_1.getStoredToken)(context) ?? undefined;
            const folders = vscode.workspace.workspaceFolders;
            if (!folders?.length) {
                vscode.window.showWarningMessage("CodeMint: Open a folder first.");
                return;
            }
            const root = folders[0];
            let manifest = await (0, manifest_1.readManifest)(root) ?? (0, manifest_1.getEmptyManifest)();
            await (0, manifest_1.ensureManifestDir)(root);
            if (!manifest.installed.length) {
                vscode.window.showInformationMessage("CodeMint: Nothing installed to sync.");
                return;
            }
            const catalogIds = manifest.installed.map((e) => e.catalogId);
            const { items } = await (0, api_1.catalogSync)(catalogIds, token);
            const byCatalogId = new Map();
            catalogIds.forEach((id, i) => byCatalogId.set(id, items[i] ?? null));
            let updated = 0;
            let upToDate = 0;
            for (const entry of manifest.installed) {
                const remote = byCatalogId.get(entry.catalogId) ?? null;
                if (!remote) {
                    channel.appendLine(`Skip ${entry.slug}: not found on server`);
                    continue;
                }
                const changed = remote.catalogVersion !== entry.version ||
                    (remote.checksum != null && remote.checksum !== entry.checksum);
                if (!changed) {
                    upToDate++;
                    continue;
                }
                const rootPath = root.uri.fsPath;
                const fullPath = path.join(rootPath, entry.path);
                const body = (0, writers_1.writeContent)(remote.content, remote.title, remote.type, entry.tool);
                await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(body, "utf8"));
                manifest = (0, manifest_1.updateEntry)(manifest, entry.catalogId, {
                    version: remote.catalogVersion,
                    checksum: remote.checksum ?? null,
                });
                updated++;
                channel.appendLine(`Updated ${entry.slug} to ${remote.catalogVersion}`);
            }
            manifest = { ...manifest, lastSyncAt: new Date().toISOString() };
            await (0, manifest_1.writeManifest)(root, manifest);
            await vscode.commands.executeCommand("codemint.refreshSidebar");
            vscode.window.showInformationMessage(`CodeMint: Synced. ${updated} updated, ${upToDate} up-to-date.`);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            channel.appendLine(`Error: ${msg}`);
            vscode.window.showErrorMessage(`CodeMint: ${msg}`);
        }
    }));
}
//# sourceMappingURL=sync.js.map