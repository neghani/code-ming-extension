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
exports.registerSuggestCommand = registerSuggestCommand;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const auth_1 = require("../auth");
const api_1 = require("../api");
const toolDetect_1 = require("../toolDetect");
const install_1 = require("./install");
const TECH_MARKERS = [
    { file: "package.json", tags: ["node", "javascript"] },
    { file: "tsconfig.json", tags: ["typescript"] },
    { file: "next.config.js", tags: ["nextjs"] },
    { file: "next.config.mjs", tags: ["nextjs"] },
    { file: "next.config.ts", tags: ["nextjs"] },
    { file: "requirements.txt", tags: ["python"] },
    { file: "pyproject.toml", tags: ["python"] },
    { file: "Cargo.toml", tags: ["rust"] },
    { file: "go.mod", tags: ["go"] },
];
async function deriveTags(root) {
    const tags = new Set();
    const rootPath = root.uri.fsPath;
    for (const { file, tags: t } of TECH_MARKERS) {
        const uri = vscode.Uri.file(path.join(rootPath, file));
        try {
            await vscode.workspace.fs.stat(uri);
            t.forEach((tag) => tags.add(tag));
        }
        catch {
            // not found
        }
    }
    try {
        const pkgUri = vscode.Uri.file(path.join(rootPath, "package.json"));
        const buf = await vscode.workspace.fs.readFile(pkgUri);
        const pkg = JSON.parse(Buffer.from(buf).toString("utf8"));
        const deps = { ...pkg.dependencies, ...(pkg.devDependencies ?? {}) };
        if (deps["next"])
            tags.add("nextjs");
        if (deps["react"])
            tags.add("react");
        if (deps["vue"])
            tags.add("vue");
        if (deps["svelte"])
            tags.add("svelte");
        if (deps["typescript"])
            tags.add("typescript");
        if (deps["tailwindcss"])
            tags.add("tailwind");
    }
    catch {
        // ignore
    }
    return Array.from(tags);
}
function registerSuggestCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand("codemint.suggest", async () => {
        try {
            const token = await (0, auth_1.getStoredToken)(context) ?? undefined;
            const { root, tool } = await (0, toolDetect_1.ensureTool)(context);
            const tags = await deriveTags(root);
            if (!tags.length) {
                vscode.window.showInformationMessage("CodeMint: No tech markers found. Try CodeMint: Add and search manually.");
                return;
            }
            const [rulesRes, skillsRes] = await Promise.all([
                (0, api_1.itemsSearch)({ tags, type: "rule", limit: 10 }, token),
                (0, api_1.itemsSearch)({ tags, type: "skill", limit: 10 }, token),
            ]);
            const combined = [...rulesRes.items, ...skillsRes.items];
            if (!combined.length) {
                vscode.window.showInformationMessage("CodeMint: No recommendations for this project.");
                return;
            }
            const picked = await vscode.window.showQuickPick(combined.map((item) => ({
                label: item.name,
                description: `@${item.type}/${item.slug}`,
                detail: item.tags?.length ? item.tags.join(", ") : undefined,
                item,
            })), { title: "Suggested for your stack", matchOnDetail: true });
            if (!picked)
                return;
            await (0, install_1.installSuggestItem)(context, picked.item);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            vscode.window.showErrorMessage(`CodeMint: ${msg}`);
        }
    }));
}
//# sourceMappingURL=suggest.js.map