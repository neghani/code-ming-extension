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
exports.installSuggestItem = installSuggestItem;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const auth_1 = require("../auth");
const api_1 = require("../api");
const toolDetect_1 = require("../toolDetect");
const writers_1 = require("../writers");
const manifest_1 = require("../manifest");
async function installSuggestItem(context, item) {
    const token = await (0, auth_1.getStoredToken)(context) ?? undefined;
    const { root, tool } = await (0, toolDetect_1.ensureTool)(context);
    const rootPath = root.uri.fsPath;
    const ref = `@${item.type}/${item.slug}`;
    const catalog = await (0, api_1.catalogResolve)(ref, token);
    if (catalog.type !== "rule" && catalog.type !== "skill") {
        throw new Error("Only rules and skills can be installed.");
    }
    const fullPath = (0, writers_1.writePath)(rootPath, catalog.slug, catalog.type, tool);
    const relPath = path.relative(rootPath, fullPath);
    const dir = path.dirname(fullPath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
    const body = (0, writers_1.writeContent)(catalog.content, catalog.title, catalog.type, tool);
    await vscode.workspace.fs.writeFile(vscode.Uri.file(fullPath), Buffer.from(body, "utf8"));
    let manifest = await (0, manifest_1.readManifest)(root) ?? (0, manifest_1.getEmptyManifest)();
    await (0, manifest_1.ensureManifestDir)(root);
    const entry = {
        catalogId: catalog.catalogId,
        ref: `@${catalog.type}/${catalog.slug}`,
        type: catalog.type,
        slug: catalog.slug,
        tool,
        version: catalog.catalogVersion,
        checksum: catalog.checksum ?? null,
        installedAt: new Date().toISOString(),
        path: relPath,
    };
    manifest = (0, manifest_1.addEntry)(manifest, entry);
    await (0, manifest_1.writeManifest)(root, manifest);
    (0, api_1.trackUsage)(catalog.id, token).catch(() => { });
    await vscode.commands.executeCommand("codemint.refreshSidebar");
    vscode.window.showInformationMessage(`CodeMint: Added ${catalog.title} to ${tool}.`);
}
//# sourceMappingURL=install.js.map