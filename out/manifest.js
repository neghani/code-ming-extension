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
exports.getEmptyManifest = exports.updateEntry = exports.removeEntry = exports.addEntry = exports.writeManifest = exports.ensureManifestDir = exports.readManifest = void 0;
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
exports.readManifest = readManifest;
async function ensureManifestDir(root) {
    const dirPath = path.join(root.uri.fsPath, types_1.CODEMINT_DIR);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
    return dirPath;
}
exports.ensureManifestDir = ensureManifestDir;
async function writeManifest(root, manifest) {
    await ensureManifestDir(root);
    const manifestPath = path.join(root.uri.fsPath, types_1.MANIFEST_FILE);
    const content = JSON.stringify(manifest, null, 2);
    await vscode.workspace.fs.writeFile(vscode.Uri.file(manifestPath), Buffer.from(content, "utf8"));
}
exports.writeManifest = writeManifest;
function addEntry(manifest, entry) {
    const next = { ...manifest, installed: manifest.installed.filter((e) => e.catalogId !== entry.catalogId) };
    next.installed.push(entry);
    return next;
}
exports.addEntry = addEntry;
function removeEntry(manifest, catalogId) {
    return {
        ...manifest,
        installed: manifest.installed.filter((e) => e.catalogId !== catalogId),
    };
}
exports.removeEntry = removeEntry;
function updateEntry(manifest, catalogId, upd) {
    return {
        ...manifest,
        installed: manifest.installed.map((e) => e.catalogId === catalogId ? { ...e, ...upd } : e),
    };
}
exports.updateEntry = updateEntry;
function getEmptyManifest() {
    return {
        version: types_1.MANIFEST_VERSION,
        baseUrl: getBaseUrl(),
        installed: [],
    };
}
exports.getEmptyManifest = getEmptyManifest;
//# sourceMappingURL=manifest.js.map