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
exports.detectTool = detectTool;
exports.getWorkspaceRoot = getWorkspaceRoot;
exports.ensureTool = ensureTool;
exports.getToolDir = getToolDir;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const DETECTION_ORDER = [
    { id: "cursor", markers: [".cursor"] },
    { id: "cline", markers: [".cline", ".clinerules"] },
    { id: "windsurf", markers: [".windsurf"] },
    { id: "continue", markers: [".continue"] },
    { id: "copilot", markers: [".github/instructions"] },
    { id: "claude", markers: ["CLAUDE.md", ".claude"] },
    { id: "codex", markers: [".codex"] },
];
async function detectTool(root) {
    const overrides = vscode.workspace.getConfiguration("codemint").get("toolOverrides");
    if (overrides?.length) {
        const first = overrides[0].toLowerCase();
        if (["cursor", "cline", "windsurf", "continue", "copilot", "claude", "codex"].includes(first)) {
            return first;
        }
    }
    const rootPath = root.uri.fsPath;
    for (const { id, markers } of DETECTION_ORDER) {
        for (const marker of markers) {
            const p = path.join(rootPath, marker);
            try {
                const stat = await vscode.workspace.fs.stat(vscode.Uri.file(p));
                if (stat.type === vscode.FileType.Directory || stat.type === vscode.FileType.File) {
                    return id;
                }
            }
            catch {
                // not found
            }
        }
    }
    return null;
}
async function getWorkspaceRoot() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length)
        return null;
    return folders[0];
}
async function ensureTool(context) {
    const root = await getWorkspaceRoot();
    if (!root)
        throw new Error("Open a folder first.");
    let tool = await detectTool(root);
    if (!tool) {
        const picked = await vscode.window.showQuickPick([
            { label: "Cursor", value: "cursor" },
            { label: "Cline", value: "cline" },
            { label: "Windsurf", value: "windsurf" },
            { label: "Continue", value: "continue" },
            { label: "Copilot", value: "copilot" },
            { label: "Claude", value: "claude" },
            { label: "Codex", value: "codex" },
        ], { title: "No AI tool folder detected. Choose one to create:" });
        if (!picked)
            throw new Error("No tool selected.");
        tool = picked.value;
        const dir = getToolDir(tool);
        const fullPath = path.join(root.uri.fsPath, dir);
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(fullPath));
        if (tool === "cursor") {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.join(fullPath, "rules")));
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(path.join(fullPath, "skills")));
        }
    }
    return { root, tool };
}
function getToolDir(tool) {
    const map = {
        cursor: ".cursor",
        cline: ".cline",
        windsurf: ".windsurf",
        continue: ".continue",
        copilot: ".github/instructions",
        claude: ".claude",
        codex: ".codex",
    };
    return map[tool];
}
//# sourceMappingURL=toolDetect.js.map