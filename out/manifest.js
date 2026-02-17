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
exports.readManifest = readManifest;
exports.ensureManifestDir = ensureManifestDir;
exports.writeManifest = writeManifest;
exports.addEntry = addEntry;
exports.removeEntry = removeEntry;
exports.updateEntry = updateEntry;
exports.getEmptyManifest = getEmptyManifest;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const types_1 = require("./types");
function getBaseUrl() {
    return vscode.workspace.getConfiguration("codemint").get("baseUrl") ?? "https://codemint.app";
}
async function readManifest(root) {
    const manifestPath = path.join(root.uri.fsPath, types_1.MANIFEST_FILE);
    try {
        const data = await vscode.workspace.fs.readFile(vscode.Uri.file(manifestPath));
        const parsed = JSON.parse(Buffer.from(data).toString("utf8"));
        if (!parsed.installed || !Array.isArray(parsed.installed)) {
            return { version: types_1.MANIFEST_VERSION, baseUrl: getBaseUrl(), installed: [] };
        }
        return {
            version: parsed.version ?? types_1.MANIFEST_VERSION,
            baseUrl: parsed.baseUrl ?? getBaseUrl(),
            lastSyncAt: parsed.lastSyncAt,
            installed: parsed.installed,
        };
    }
    catch {
        return null;
    }
}
async function ensureManifestDir(root) {
    const dirPath = path.join(root.uri.fsPath, types_1.CODEMINT_DIR);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
    return dirPath;
}
async function writeManifest(root, manifest) {
    await ensureManifestDir(root);
    const manifestPath = path.join(root.uri.fsPath, types_1.MANIFEST_FILE);
    const content = JSON.stringify(manifest, null, 2);
    await vscode.workspace.fs.writeFile(vscode.Uri.file(manifestPath), Buffer.from(content, "utf8"));
}
function addEntry(manifest, entry) {
    const next = { ...manifest, installed: manifest.installed.filter((e) => e.catalogId !== entry.catalogId) };
    next.installed.push(entry);
    return next;
}
function removeEntry(manifest, catalogId) {
    return {
        ...manifest,
        installed: manifest.installed.filter((e) => e.catalogId !== catalogId),
    };
}
function updateEntry(manifest, catalogId, upd) {
    return {
        ...manifest,
        installed: manifest.installed.map((e) => e.catalogId === catalogId ? { ...e, ...upd } : e),
    };
}
function getEmptyManifest() {
    return {
        version: types_1.MANIFEST_VERSION,
        baseUrl: getBaseUrl(),
        installed: [],
    };
}
//# sourceMappingURL=manifest.js.map