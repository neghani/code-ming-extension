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
exports.registerAddCommand = registerAddCommand;
const vscode = __importStar(require("vscode"));
const auth_1 = require("../auth");
const api_1 = require("../api");
const install_1 = require("./install");
function registerAddCommand(context) {
    context.subscriptions.push(vscode.commands.registerCommand("codemint.add", async () => {
        try {
            const token = await (0, auth_1.getStoredToken)(context) ?? undefined;
            const q = await vscode.window.showInputBox({
                prompt: "Search rules and skills",
                placeHolder: "e.g. nextjs, react, typescript",
            });
            if (q === undefined)
                return;
            const res = await (0, api_1.itemsSearch)({ q: q || undefined, limit: 25 }, token);
            if (!res.items.length) {
                vscode.window.showInformationMessage("CodeMint: No results.");
                return;
            }
            const picked = await vscode.window.showQuickPick(res.items.map((item) => ({
                label: item.name,
                description: `@${item.type}/${item.slug}`,
                detail: item.tags?.length ? item.tags.join(", ") : undefined,
                item,
            })), { matchOnDescription: true, matchOnDetail: true, title: "Select to add" });
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
//# sourceMappingURL=add.js.map