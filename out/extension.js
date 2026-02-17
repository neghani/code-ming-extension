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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const auth_1 = require("./auth");
const add_1 = require("./commands/add");
const sync_1 = require("./commands/sync");
const remove_1 = require("./commands/remove");
const suggest_1 = require("./commands/suggest");
const list_1 = require("./commands/list");
const sidebar_1 = require("./sidebar");
const statusBar_1 = require("./statusBar");
const explore_1 = require("./explore");
const settings_1 = require("./settings");
function activate(context) {
    (0, auth_1.registerAuthCommands)(context);
    (0, add_1.registerAddCommand)(context);
    (0, sync_1.registerSyncCommand)(context);
    (0, remove_1.registerRemoveCommand)(context);
    (0, suggest_1.registerSuggestCommand)(context);
    (0, list_1.registerListCommand)(context);
    (0, settings_1.registerSettingsCommands)(context);
    (0, sidebar_1.createSidebar)(context);
    (0, statusBar_1.createStatusBar)(context);
    (0, explore_1.createExploreView)(context);
    const autoSync = async () => {
        const auto = vscode.workspace.getConfiguration("codemint").get("autoSync");
        if (!auto || !vscode.workspace.workspaceFolders?.length)
            return;
        const root = vscode.workspace.workspaceFolders[0];
        const { readManifest } = await Promise.resolve().then(() => __importStar(require("./manifest")));
        const manifest = await readManifest(root);
        if (manifest?.installed?.length) {
            void vscode.commands.executeCommand("codemint.sync").then(undefined, () => { });
        }
    };
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => { autoSync(); }));
    autoSync();
}
function deactivate() { }
//# sourceMappingURL=extension.js.map